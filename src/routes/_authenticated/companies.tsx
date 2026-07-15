import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencySelect } from "@/components/currency-select";
import { setDefaultCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import { Upload, Building, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({ meta: [{ title: "Company settings — Free Accounting" }] }),
  component: CompanyPage,
});

type Company = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tax_number: string;
  currency: string;
  logo_url: string | null;
};

const EMPTY: Company = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  tax_number: "",
  currency: "USD",
  logo_url: null,
};

function CompanyPage() {
  const [company, setCompany] = useState<Company>(EMPTY);
  const [profileCurrency, setProfileCurrency] = useState("USD");
  const [logoDisplay, setLogoDisplay] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refreshLogoDisplay(path: string | null) {
    if (!path) return setLogoDisplay(null);
    const { data } = await supabase.storage.from("company-logos").createSignedUrl(path, 3600);
    setLogoDisplay(data?.signedUrl ?? null);
  }

async function loadActiveCompany(userIdArg: string) {
    const activeId = typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null;

    const companyQuery = activeId
      ? supabase.from("companies").select("*").eq("id", activeId).maybeSingle()
      : supabase
          .from("companies")
          .select("*")
          .order("created_at")
          .limit(1)
          .maybeSingle();

    const [{ data: c }, { data: p }] = await Promise.all([
      companyQuery,
      supabase.from("profiles").select("default_currency").eq("id", userIdArg).maybeSingle(),
    ]);

    if (c) {
      setCompany({ ...EMPTY, ...c } as Company);
      refreshLogoDisplay((c as any).logo_url ?? null);
    } else {
      // no companies at all yet (shouldn't normally happen post-signup, but
      // don't silently keep showing stale state from a previous company)
      setCompany(EMPTY);
      setLogoDisplay(null);
    }
    if (p?.default_currency) setProfileCurrency(p.default_currency);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      await loadActiveCompany(u.user.id);
    })();

    function handleCompanyChanged() {
      const { data } = supabase.auth.getSession() as any;
      // getSession() is sync-ish here only for the cached session; simplest
      // safe approach is to just re-run with the userId we already have.
      if (userId) loadActiveCompany(userId);
    }
    window.addEventListener("company-changed", handleCompanyChanged);
    return () => window.removeEventListener("company-changed", handleCompanyChanged);
  }, [userId]);

  async function uploadLogo(file: File) {
    if (!userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    setCompany((c) => ({ ...c, logo_url: path }));
    await refreshLogoDisplay(path);
    setUploading(false);
    toast.success("Logo uploaded — remember to save");
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    const payload = { ...company, user_id: userId };
    let error;
    if (company.id) {
      ({ error } = await supabase.from("companies").update(payload).eq("id", company.id));
    } else {
      const { data, error: e } = await supabase
        .from("companies")
        .insert(payload)
        .select("id")
        .single();
      error = e;
      if (data) setCompany((c) => ({ ...c, id: data.id }));
    }
    if (!error) {
      await supabase
        .from("profiles")
        .update({ default_currency: profileCurrency })
        .eq("id", userId);
      setDefaultCurrency(profileCurrency);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Company saved");
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Company settings</h1>
        <p className="text-muted-foreground">
          Your logo, name and address appear on invoices and PDFs.
        </p>
      </div>

      <div className="grid gap-6">
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building className="h-4 w-4" />
            <h2 className="font-semibold">Branding</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoDisplay ? (
                <img src={logoDisplay} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}{" "}
                Upload logo
              </Button>
              <p className="text-xs text-muted-foreground mt-2">PNG or JPG. Recommended 512×512.</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-semibold mb-2">Business details</h2>
          </div>
          <div>
            <Label>Company name</Label>
            <Input
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Tax / VAT number</Label>
            <Input
              value={company.tax_number}
              onChange={(e) => setCompany({ ...company, tax_number: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={company.phone}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Website</Label>
            <Input
              value={company.website}
              onChange={(e) => setCompany({ ...company, website: e.target.value })}
            />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-semibold mb-2">Address</h2>
          </div>
          <div className="md:col-span-2">
            <Label>Street address</Label>
            <Textarea
              rows={2}
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
            />
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={company.city}
              onChange={(e) => setCompany({ ...company, city: e.target.value })}
            />
          </div>
          <div>
            <Label>State / Province</Label>
            <Input
              value={company.state}
              onChange={(e) => setCompany({ ...company, state: e.target.value })}
            />
          </div>
          <div>
            <Label>Postal code</Label>
            <Input
              value={company.postal_code}
              onChange={(e) => setCompany({ ...company, postal_code: e.target.value })}
            />
          </div>
          <div>
            <Label>Country</Label>
            <Input
              value={company.country}
              onChange={(e) => setCompany({ ...company, country: e.target.value })}
            />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-semibold mb-1">Currency</h2>
            <p className="text-xs text-muted-foreground mb-2">
              Dashboard reports and defaults for new invoices/expenses use your preferred currency.
            </p>
          </div>
          <div>
            <Label>Dashboard currency (your preference)</Label>
            <CurrencySelect value={profileCurrency} onValueChange={setProfileCurrency} />
          </div>
          <div>
            <Label>Default company currency</Label>
            <CurrencySelect
              value={company.currency}
              onValueChange={(v) => setCompany({ ...company, currency: v })}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-gradient-hero">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
