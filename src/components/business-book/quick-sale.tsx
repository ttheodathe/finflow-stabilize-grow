import { useEffect, useMemo, useState } from "react";
import { scoped } from "@/lib/company-scope";
import { supabase as _sb } from "@/integrations/supabase/client";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { lockExchangeRate } from "@/lib/fx-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const supabase = _sb as any;

type SaleProduct = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  tax_rate: number;
  currency: string;
  track_inventory: boolean;
  stock_quantity: number | null;
};

type SaleCustomer = { id: string; name: string };

type QuickSaleProps = {
  companyId: string;
  onSaved: () => void;
};

const METHODS = ["cash", "bank_transfer", "card", "check", "other"];

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(2)}`;
  }
}

export function QuickSale({ companyId, onSaved }: QuickSaleProps) {
  const defaultCurrency = useDefaultCurrency();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [customers, setCustomers] = useState<SaleCustomer[]>([]);
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [saleDate, setSaleDate] = useState(localDate());
  const [paidNow, setPaidNow] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      supabase
        .from("items")
        .select("id,name,sku,price,tax_rate,currency,track_inventory,stock_quantity")
        .eq("company_id", companyId)
        .eq("type", "product")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("customers")
        .select("id,name")
        .eq("company_id", companyId)
        .order("name"),
    ]).then(([productResult, customerResult]: any[]) => {
      if (cancelled) return;
      if (productResult.error || customerResult.error) {
        toast.error(productResult.error?.message ?? customerResult.error?.message ?? "Could not load sale options");
      } else {
        setProducts((productResult.data ?? []) as SaleProduct[]);
        setCustomers((customerResult.data ?? []) as SaleCustomer[]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, open]);

  const product = products.find((item) => item.id === productId) ?? null;
  const currency = product?.currency || defaultCurrency || "USD";
  const qty = Number(quantity);
  const price = Number(unitPrice);
  const subtotal = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
  const tax = subtotal * (Number(product?.tax_rate ?? 0) / 100);
  const total = subtotal + tax;
  const received = Number(paymentAmount);

  useEffect(() => {
    if (!product) return;
    setUnitPrice(String(Number(product.price) || 0));
    setPaymentAmount(String((Number(product.price) || 0) * (Number(quantity) || 1) * (1 + Number(product.tax_rate || 0) / 100)));
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    setPaymentAmount(total.toFixed(2));
  }, [quantity, unitPrice, productId]);

  const canSave = useMemo(
    () =>
      !!product &&
      Number.isFinite(qty) &&
      qty > 0 &&
      Number.isFinite(price) &&
      price >= 0 &&
      total > 0 &&
      (!paidNow || (Number.isFinite(received) && received > 0 && received <= total + 0.000001)),
    [product, qty, price, total, paidNow, received],
  );

  function resetForm() {
    setProductId("");
    setCustomerId("");
    setQuantity("1");
    setUnitPrice("");
    setSaleDate(localDate());
    setPaidNow(true);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setReference("");
  }

  async function saveSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !product || !canSave) return;
    setSaving(true);
    let invoiceId: string | null = null;
    let invoiceNumber = "";
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Your session has expired. Please sign in again.");

      // The invoice is staged as a draft until its line is saved. Moving it to
      // sent then invokes the existing stock-dispatch and invoice-journal logic.
      const { rate, companyCurrency } = await lockExchangeRate(companyId, currency);
      invoiceNumber = `SALE-${saleDate.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const invoicePayload = {
        user_id: authData.user.id,
        company_id: companyId,
        customer_id: customerId || null,
        invoice_number: invoiceNumber,
        issue_date: saleDate,
        due_date: saleDate,
        status: "draft",
        currency,
        subtotal,
        tax,
        total,
        notes: "Quick sale recorded from Business Book",
        exchange_rate: rate,
        base_currency_amount: currency === companyCurrency ? total : total * rate,
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert(scoped(invoicePayload))
        .select("id")
        .single();
      if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? "Could not create the sale");
      invoiceId = invoice.id;

      const { error: lineError } = await supabase.from("invoice_items").insert(
        scoped({
          invoice_id: invoice.id,
          user_id: authData.user.id,
          company_id: companyId,
          item_id: product.id,
          description: product.name,
          quantity: qty,
          unit_price: price,
          tax_rate: Number(product.tax_rate ?? 0),
          amount: subtotal,
        }),
      );
      if (lineError) {
        await supabase.from("invoices").delete().eq("id", invoice.id).eq("company_id", companyId);
        invoiceId = null;
        throw new Error(lineError.message);
      }

      const { error: finalizeError } = await supabase
        .from("invoices")
        .update({ status: "sent" })
        .eq("id", invoice.id)
        .eq("company_id", companyId);
      if (finalizeError) {
        await supabase.from("invoices").delete().eq("id", invoice.id).eq("company_id", companyId);
        invoiceId = null;
        throw new Error(finalizeError.message);
      }

      if (paidNow) {
        const { rate: paymentRate, companyCurrency: paymentCompanyCurrency } = await lockExchangeRate(companyId, currency);
        const { error: paymentError } = await supabase.from("payments").insert(
          scoped({
            user_id: authData.user.id,
            company_id: companyId,
            invoice_id: invoice.id,
            customer_id: customerId || null,
            payment_date: saleDate,
            amount: received,
            currency,
            exchange_rate: paymentRate,
            base_currency_amount:
              currency === paymentCompanyCurrency ? received : received * paymentRate,
            method: paymentMethod,
            reference: reference.trim() || null,
            deposit_account_id: null,
            notes: "Payment recorded with quick sale",
          }),
        );
        if (paymentError) {
          toast.error(
            `Sale ${invoiceNumber} was saved, but payment was not recorded: ${paymentError.message}. Record the payment from Payments received.`,
            { duration: 10000 },
          );
          setOpen(false);
          resetForm();
          onSaved();
          return;
        }
      }

      toast.success(paidNow ? "Sale and payment recorded" : "Sale recorded as unpaid");
      setOpen(false);
      resetForm();
      onSaved();
    } catch (error) {
      // If an invoice was created but a later request failed, leave the
      // saved invoice visible rather than attempting an unsafe blind rollback.
      const message = error instanceof Error ? error.message : "Could not save this sale";
      toast.error(invoiceId ? `Sale ${invoiceNumber} may have been saved. Check invoices before retrying. ${message}` : message, {
        duration: 10000,
      });
      if (invoiceId) onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!saving) setOpen(nextOpen);
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <ShoppingCart className="h-4 w-4" />
          Quick sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record a quick sale</DialogTitle>
          <DialogDescription>
            Record a product sale using your existing invoices, inventory and payment records.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={saveSale} className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId} disabled={loading || saving}>
              <SelectTrigger><SelectValue placeholder={loading ? "Loading products…" : "Choose a product"} /></SelectTrigger>
              <SelectContent>
                {products.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}{item.sku ? ` · ${item.sku}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground">Add an active product first in Products.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="0.01" step="0.01" required value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit selling price ({currency})</Label>
              <Input type="number" min="0" step="0.01" required value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Customer (optional)</Label>
            <Select value={customerId || "walk-in"} onValueChange={(value) => setCustomerId(value === "walk-in" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal, currency)}</span></div>
            <div className="mt-1 flex justify-between"><span>Tax ({Number(product?.tax_rate ?? 0)}%)</span><span>{money(tax, currency)}</span></div>
            <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{money(total, currency)}</span></div>
            {product?.track_inventory && (
              <p className="mt-2 text-xs text-muted-foreground">
                Inventory is reduced by the existing invoice stock workflow when this sale is finalized.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Payment received now</p>
              <p className="text-xs text-muted-foreground">Turn this off to record an unpaid sale.</p>
            </div>
            <input type="checkbox" checked={paidNow} onChange={(event) => setPaidNow(event.target.checked)} className="h-4 w-4 accent-primary" />
          </div>

          {paidNow && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount received ({currency})</Label>
                  <Input type="number" min="0.01" max={total} step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((method) => <SelectItem key={method} value={method}>{method.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment reference (optional)</Label>
                <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Receipt number or transaction reference" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Sale date</Label>
            <Input type="date" required value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={saving || loading || !canSave}>
            {saving ? "Saving sale…" : "Save sale"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
