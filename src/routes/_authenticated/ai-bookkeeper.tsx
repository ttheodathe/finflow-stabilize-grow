import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase as _sb } from "@/integrations/supabase/client";
// Schema drift: generated Database types lag behind applied migrations.
const supabase = _sb as any; // untyped-db
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { askBookkeeper } from "@/lib/ai-bookkeeper.functions";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/ai-bookkeeper")({
  head: () => ({ meta: [{ title: "AI Bookkeeper — Finflow Track" }] }),
  component: BookkeeperPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What was my revenue this month?",
  "Who are my top 3 customers by revenue?",
  "Which expense category is highest?",
  "List overdue invoices and total due.",
  "Which products are low on stock?",
];

type QueueItem = {
  id: string;
  task_type: "categorize_transaction" | "match_bill_payment" | "match_invoice_payment";
  source_id: string;
  proposed: Record<string, unknown>;
  confidence: number;
  status: string;
  reason: string | null;
  created_at: string;
};

type AutoAppliedStat = { count: number };

function taskLabel(t: QueueItem["task_type"]) {
  if (t === "categorize_transaction") return "Categorize transaction";
  if (t === "match_bill_payment") return "Match to bill";
  return "Match to invoice";
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const variant = pct >= 90 ? "default" : pct >= 70 ? "secondary" : "destructive";
  return (
    <Badge variant={variant as any} className="font-normal">
      {pct}% confidence
    </Badge>
  );
}

function BookkeeperPage() {
  const companyId = useActiveCompanyId();
  const ask = useServerFn(askBookkeeper);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your AI bookkeeper. Ask me anything about your invoices, expenses, customers, or inventory. I also auto-categorize bank transactions and match payments to bills and invoices — check the Review Queue tab for anything I'm not fully sure about.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [autoAppliedToday, setAutoAppliedToday] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function loadQueue() {
    if (!companyId) return;
    setQueueLoading(true);
    const [pendingRes, autoRes] = await Promise.all([
      supabase
        .from("ai_review_queue")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_review_queue")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "auto_applied")
        .gte("resolved_at", new Date().toISOString().slice(0, 10)),
    ]);
    if (pendingRes.error) toast.error(pendingRes.error.message);
    else setQueue(pendingRes.data as QueueItem[]);
    setAutoAppliedToday((autoRes as any)?.count ?? 0);
    setQueueLoading(false);
  }
  useEffect(() => {
    loadQueue(); /* eslint-disable-next-line */
  }, [companyId]);

  async function runNow() {
    if (!companyId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc("ai_process_pending_transactions", {
        _company_id: companyId,
      });
      if (error) return toast.error(error.message);
      toast.success(`Reviewed ${data ?? 0} unprocessed bank transaction${data === 1 ? "" : "s"}`);
      loadQueue();
    } finally {
      setRunning(false);
    }
  }

  async function resolve(id: string, approve: boolean) {
    setResolvingId(id);
    try {
      const { error } = await supabase.rpc("ai_resolve_review_task", {
        _task_id: id,
        _approve: approve,
      });
      if (error) return toast.error(error.message);
      toast.success(approve ? "Applied to your books" : "Dismissed");
      setQueue((q) => q.filter((item) => item.id !== id));
    } finally {
      setResolvingId(null);
    }
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const history = next.slice(1); // drop initial greeting
      const { reply } = await ask({
        data: { messages: history.map((m) => ({ role: m.role, content: m.content })) },
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reach AI");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AI Bookkeeper
          </h1>
          <p className="text-muted-foreground">
            Ask questions, or let it categorize and reconcile your books automatically.
          </p>
        </div>
        {autoAppliedToday > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            {autoAppliedToday} auto-applied today
          </Badge>
        )}
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-3 w-fit">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5">
            Review queue
            {queue.length > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 rounded-full">
                {queue.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-xl border bg-card p-4 space-y-3"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm bg-muted flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)} disabled={loading}>
                  {s}
                </Button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 mt-3"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your bookkeeper…"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-hero gap-1.5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{" "}
              Send
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="review" className="flex-1 overflow-y-auto min-h-0 mt-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              Anything below 99% confidence lands here instead of being posted automatically.
              Everything at or above 99% was already applied — see the count above.
            </p>
            <Button variant="outline" size="sm" onClick={runNow} disabled={running}>
              <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Running…" : "Run now"}
            </Button>
          </div>

          {queueLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border rounded-xl bg-card">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
              Nothing needs review right now.
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item) => (
                <Card key={item.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium">{taskLabel(item.task_type)}</span>
                      <ConfidenceBadge confidence={item.confidence} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.reason}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolvingId === item.id}
                      onClick={() => resolve(item.id, false)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-hero"
                      disabled={resolvingId === item.id}
                      onClick={() => resolve(item.id, true)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
