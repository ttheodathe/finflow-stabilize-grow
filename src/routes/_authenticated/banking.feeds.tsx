import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banking/feeds")({
  head: () => ({ meta: [{ title: "Bank feeds — Free Accounting" }] }),
  component: BankFeedsPage,
});

type BankAccount = { id: string; name: string; currency: string };
type ParsedRow = { txn_date: string; description: string; amount: number };

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

// Small dependency-free CSV parser: handles quoted fields and commas within quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdY = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdY) {
    const [, m, d, y] = mdY;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function BankFeedsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data } = await (supabase as any)
      .from("bank_accounts")
      .select("id,name,currency")
      .eq("is_active", true)
      .order("name");
    if (data) setAccounts(data as BankAccount[]);
  }
  useEffect(() => {
    load();
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const raw = parseCsv(text);
      if (raw.length === 0) return toast.error("That file looks empty");
      const header = raw[0].map((h) => h.trim().toLowerCase());
      const dateIdx = header.findIndex((h) => h.includes("date"));
      const descIdx = header.findIndex(
        (h) => h.includes("desc") || h.includes("memo") || h.includes("narration"),
      );
      const amountIdx = header.findIndex((h) => h.includes("amount"));
      const debitIdx = header.findIndex((h) => h.includes("debit") || h.includes("withdrawal"));
      const creditIdx = header.findIndex((h) => h.includes("credit") || h.includes("deposit"));

      if (dateIdx === -1 || (amountIdx === -1 && debitIdx === -1 && creditIdx === -1)) {
        toast.error("Couldn't find Date + Amount (or Debit/Credit) columns in the header row");
        return;
      }

      const parsed: ParsedRow[] = [];
      let bad = 0;
      for (const line of raw.slice(1)) {
        const iso = toIsoDate(line[dateIdx] ?? "");
        if (!iso) {
          bad++;
          continue;
        }
        let amount: number;
        if (amountIdx !== -1) {
          amount = Number(String(line[amountIdx] ?? "0").replace(/[,$]/g, ""));
        } else {
          const debit = Number(String(line[debitIdx] ?? "0").replace(/[,$]/g, "")) || 0;
          const credit = Number(String(line[creditIdx] ?? "0").replace(/[,$]/g, "")) || 0;
          amount = credit - debit;
        }
        if (Number.isNaN(amount)) {
          bad++;
          continue;
        }
        const description = descIdx !== -1 ? (line[descIdx] ?? "").trim() : "";
        parsed.push({ txn_date: iso, description, amount });
      }
      setRows(parsed);
      setSkipped(bad);
      if (parsed.length === 0) toast.error("No valid rows found");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmImport() {
    if (!accountId) return toast.error("Choose which account this feed belongs to");
    if (rows.length === 0) return toast.error("Nothing to import yet");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setImporting(true);
    const batch = `csv-${Date.now()}`;
    const payload = rows.map((r) => ({
      user_id: u.user!.id,
      bank_account_id: accountId,
      txn_date: r.txn_date,
      description: r.description,
      amount: r.amount,
      import_batch: batch,
    }));
    // Insert in chunks to stay well under any request size limits.
    const chunkSize = 200;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await (supabase as any).from("bank_transactions").insert(chunk);
      if (error) {
        setImporting(false);
        return toast.error(error.message);
      }
    }
    setImporting(false);
    toast.success(`Imported ${payload.length} transaction${payload.length === 1 ? "" : "s"}`);
    setRows([]);
    setSkipped(0);
    setFileName("");
  }

  const totalIn = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "USD";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bank feeds</h1>
        <p className="text-muted-foreground">
          Import transactions from a CSV export of your bank or mobile money statement.
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6 mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Account to import into</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CSV file</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4" /> {fileName || "Choose file…"}
            </Button>
          </div>
        </div>
        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertTitle>Expected columns</AlertTitle>
          <AlertDescription>
            A header row with <strong>Date</strong> and either <strong>Amount</strong> (positive =
            in, negative = out) or separate <strong>Debit</strong>/<strong>Credit</strong> columns.
            A <strong>Description</strong> column is optional but recommended.
          </AlertDescription>
        </Alert>
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-card border rounded-xl p-4">
              <div className="text-sm text-muted-foreground">Rows ready to import</div>
              <div className="text-2xl font-bold">{rows.length}</div>
              {skipped > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {skipped} row{skipped > 1 ? "s" : ""} skipped (unreadable date/amount)
                </div>
              )}
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="text-sm text-muted-foreground">Total in</div>
              <div className="text-2xl font-bold text-emerald-600">{fmt(totalIn, currency)}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="text-sm text-muted-foreground">Total out</div>
              <div className="text-2xl font-bold text-red-600">{fmt(totalOut, currency)}</div>
            </div>
          </div>

          <div className="bg-card border rounded-xl mb-4 max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 300).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.txn_date}</TableCell>
                    <TableCell className="text-sm">{r.description || "—"}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${r.amount < 0 ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {fmt(r.amount, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 300 && (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Showing first 300 of {rows.length} rows
              </div>
            )}
          </div>

          <Button
            onClick={confirmImport}
            disabled={importing || !accountId}
            className="bg-gradient-hero"
          >
            <CheckCircle2 className="h-4 w-4" />{" "}
            {importing ? "Importing…" : `Import ${rows.length} transactions`}
          </Button>
        </>
      )}
    </div>
  );
}
