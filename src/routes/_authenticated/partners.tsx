import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useMyPartner,
  usePartnerApiKeys,
  usePartnerCommissions,
  usePartnerDashboardStats,
  usePartnerPayouts,
} from "@/hooks/usePartner";
import { useIsPlatformStaff } from "@/hooks/useAdminPartners";
import { createApiKey, revokeApiKey } from "@/services/partners/partnerApiKeys.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Copy,
  ExternalLink,
  HandCoins,
  KeyRound,
  MousePointerClick,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PARTNER_TYPE_LABELS } from "@/types/partner.types";

export const Route = createFileRoute("/_authenticated/partners")({
  head: () => ({ meta: [{ title: "Partners — Finflow Track" }] }),
  component: PartnersPage,
});

const COMMISSION_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  paid: "default",
  rejected: "destructive",
  cancelled: "outline",
  reversed: "destructive",
};

function PartnersPage() {
  const { partner, isLoading } = useMyPartner();
  const { isStaff } = useIsPlatformStaff();
  const { stats, isLoading: statsLoading } = usePartnerDashboardStats(partner?.id);
  const { commissions } = usePartnerCommissions(partner?.id);
  const { payouts } = usePartnerPayouts(partner?.id);
  const { apiKeys } = usePartnerApiKeys(partner?.id);
  const [copied, setCopied] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" /> Partner Program
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You're not part of the FinFlowTrack Partner Program yet. Apply to get your own
              referral link and start earning recurring commissions on every customer you refer.
            </p>
            <Button asChild>
              <a href="/partners/apply">Apply to become a partner</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePartner = partner;

  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${activePartner.referral_code}`
      : `https://finflowtrack.com/?ref=${activePartner.referral_code}`;

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleCreateApiKey() {
    try {
      const { plaintextKey } = await createApiKey(activePartner.id, newKeyName || "Default key");
      setNewKeyPlaintext(plaintextKey);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["partner-api-keys", activePartner.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create API key");
    }
  }

  async function handleRevokeApiKey(keyId: string) {
    try {
      await revokeApiKey(keyId);
      toast.success("API key revoked");
      queryClient.invalidateQueries({ queryKey: ["partner-api-keys", activePartner.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {PARTNER_TYPE_LABELS[partner.partner_type]} · {partner.commission_rate}% recurring
            commission
          </p>
        </div>
        <div className="flex items-center gap-2">
          {partner.status !== "active" && (
            <Badge variant="destructive" className="capitalize">
              {partner.status}
            </Badge>
          )}
          {isStaff && (
            <Button variant="outline" asChild>
              <Link to="/admin/partners">
                <ShieldCheck className="mr-2 h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your referral link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm">
              {referralUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href={referralUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          {copied && <p className="mt-1 text-xs text-muted-foreground">Copied to clipboard.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MousePointerClick}
          label="Clicks"
          value={stats?.totalClicks}
          loading={statsLoading}
        />
        <StatCard
          icon={Users}
          label="Referred signups"
          value={stats?.totalSignups}
          loading={statsLoading}
        />
        <StatCard
          icon={HandCoins}
          label="Pending commissions"
          value={stats ? formatMoney(stats.pendingCommissions, stats.currency) : undefined}
          loading={statsLoading}
        />
        <StatCard
          icon={HandCoins}
          label="Lifetime earnings"
          value={stats ? formatMoney(stats.lifetimeEarnings, stats.currency) : undefined}
          loading={statsLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No commissions yet — they'll show up here as soon as someone you referred becomes a
              paying customer.
            </p>
          ) : (
            <div className="divide-y">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatMoney(c.commission_amount, c.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()} · {c.commission_rate}% of{" "}
                      {formatMoney(c.billed_amount, c.currency)}
                    </p>
                  </div>
                  <Badge
                    variant={COMMISSION_STATUS_VARIANT[c.status] ?? "outline"}
                    className="capitalize"
                  >
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payout history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatMoney(p.total_amount, p.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                      {p.method ? ` · ${p.method}` : ""}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={p.status === "paid" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> API keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pull your stats (clicks, signups, commissions) programmatically — send{" "}
            <code className="rounded bg-muted px-1">X-API-Key</code> to{" "}
            <code className="rounded bg-muted px-1">/api/public/partners/stats</code>.
          </p>

          {newKeyPlaintext && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950">
              <p className="font-medium">Copy this key now — you won't be able to see it again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border bg-background px-2 py-1 text-xs">
                  {newKeyPlaintext}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(newKeyPlaintext);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              placeholder="Key name (e.g. My CRM)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <Button onClick={handleCreateApiKey}>Create key</Button>
          </div>

          {apiKeys.length > 0 && (
            <div className="divide-y">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.key_prefix}… · created {new Date(k.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {k.revoked_at ? (
                    <Badge variant="outline">Revoked</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleRevokeApiKey(k.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" /> Marketing resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Your referral guide</p>
            <p className="text-muted-foreground">
              Share your link anywhere your audience already trusts you — a newsletter mention, a
              pinned social post, or a line in your invoice footer tends to convert best. Avoid
              spammy mass-DMs; FinFlowTrack may suspend partners who violate the terms you agreed
              to.
            </p>
          </div>
          <div>
            <p className="font-medium">Sample copy</p>
            <p className="text-muted-foreground">
              "I've been using FinFlowTrack to keep my books in order — it's free to start and
              genuinely easy to use. If you're a small business owner juggling invoices and
              expenses, it's worth a look: {referralUrl}"
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Looking for logos, banners, and email templates? Reach out to your partner manager and
            we'll get you a brand kit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-16" />
          ) : (
            <p className="text-lg font-semibold">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
