import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Receipt,
  RefreshCw,
  Users,
  CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Free Accounting" }] }),
  component: CalendarPage,
});

type EventType = "invoice_due" | "bill_due" | "recurring_invoice";

type CalEvent = {
  id: string;
  date: string; // yyyy-MM-dd
  type: EventType;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  overdue: boolean;
  linkTo: string;
};

const TYPE_META: Record<
  EventType,
  { label: string; color: string; dot: string; icon: typeof FileText }
> = {
  invoice_due: { label: "Invoice due", color: "text-blue-600", dot: "bg-blue-500", icon: FileText },
  bill_due: { label: "Bill due", color: "text-amber-600", dot: "bg-amber-500", icon: Receipt },
  recurring_invoice: {
    label: "Recurring invoice",
    color: "text-violet-600",
    dot: "bg-violet-500",
    icon: RefreshCw,
  },
};

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [inv, bills, recurring] = await Promise.all([
      supabase
        .from("invoices")
        .select("id,invoice_number,due_date,total,currency,status,customers(name)")
        .not("due_date", "is", null)
        .neq("status", "paid"),
      (supabase as any)
        .from("bills")
        .select("id,bill_number,due_date,total,currency,status,vendors(name)")
        .not("due_date", "is", null)
        .neq("status", "paid"),
      (supabase as any)
        .from("recurring_invoices")
        .select(
          "id,next_run_date,frequency,customers(name),invoices:template_invoice_id(invoice_number,total,currency)",
        )
        .eq("is_active", true),
    ]);

    const today = format(new Date(), "yyyy-MM-dd");
    const evs: CalEvent[] = [];

    for (const i of inv.data ?? []) {
      if (!i.due_date) continue;
      evs.push({
        id: i.id,
        date: i.due_date,
        type: "invoice_due",
        title: `Invoice ${i.invoice_number}`,
        subtitle: (i as any).customers?.name ?? "No customer",
        amount: Number(i.total),
        currency: i.currency,
        overdue: i.due_date < today,
        linkTo: "/invoices",
      });
    }
    for (const b of bills.data ?? []) {
      evs.push({
        id: b.id,
        date: b.due_date,
        type: "bill_due",
        title: `Bill ${b.bill_number}`,
        subtitle: (b as any).vendors?.name ?? "No vendor",
        amount: Number(b.total),
        currency: b.currency,
        overdue: b.due_date < today,
        linkTo: "/purchases/bills",
      });
    }
    for (const r of recurring.data ?? []) {
      const tpl = (r as any).invoices;
      evs.push({
        id: r.id,
        date: r.next_run_date,
        type: "recurring_invoice",
        title: `Recurring invoice${tpl?.invoice_number ? ` (${tpl.invoice_number})` : ""}`,
        subtitle: `${(r as any).customers?.name ?? "No customer"} · ${r.frequency}`,
        amount: Number(tpl?.total ?? 0),
        currency: tpl?.currency ?? "USD",
        overdue: false,
        linkTo: "/sales/recurring",
      });
    }

    setEvents(evs);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  const upcoming = useMemo(() => {
    const cutoff = format(addDays(new Date(), 30), "yyyy-MM-dd");
    // Includes anything overdue (so nothing urgent gets hidden) plus everything due in the next 30 days.
    return events.filter((e) => e.date <= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const overdueCount = events.filter((e) => e.overdue).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Payment due dates, invoice reminders, and recurring invoices in one view.
          </p>
        </div>
        {overdueCount > 0 && <Badge variant="destructive">{overdueCount} overdue</Badge>}
      </div>

      <div className="flex items-center gap-1 mb-4 text-xs text-muted-foreground flex-wrap">
        {(Object.keys(TYPE_META) as EventType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5 mr-4">
            <span className={`h-2 w-2 rounded-full ${TYPE_META[t].dot}`} /> {TYPE_META[t].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-600" /> Overdue
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{format(month, "MMMM yyyy")}</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMonth(startOfMonth(new Date()));
                    setSelectedDay(format(new Date(), "yyyy-MM-dd"));
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const dayEvents = eventsByDay.get(key) ?? [];
                const inMonth = isSameMonth(d, month);
                const isSelected = key === selectedDay;
                const hasOverdue = dayEvents.some((e) => e.overdue);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-20 rounded-lg border p-1.5 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-border"
                    } ${!inMonth ? "opacity-40" : ""}`}
                  >
                    <div
                      className={`text-xs mb-1 inline-flex items-center justify-center h-5 w-5 rounded-full ${isToday(d) ? "bg-primary text-primary-foreground font-semibold" : ""}`}
                    >
                      {format(d, "d")}
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 4).map((e) => (
                        <span
                          key={e.id}
                          className={`h-1.5 w-1.5 rounded-full ${e.overdue ? "bg-red-600" : TYPE_META[e.type].dot}`}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayEvents.length - 4}
                        </span>
                      )}
                    </div>
                    {hasOverdue && <div className="text-[10px] text-red-600 mt-0.5">overdue</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 mt-4">
            <h3 className="font-semibold mb-3">{format(new Date(selectedDay), "EEEE, MMMM d")}</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((e) => {
                  const Icon = TYPE_META[e.type].icon;
                  return (
                    <Link
                      key={e.id}
                      to={e.linkTo}
                      className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${TYPE_META[e.type].color}`} />
                        <div>
                          <div className="text-sm font-medium">{e.title}</div>
                          <div className="text-xs text-muted-foreground">{e.subtitle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{fmt(e.amount, e.currency)}</div>
                        {e.overdue && (
                          <Badge variant="destructive" className="text-[10px]">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Next 30 days
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next 30 days.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {upcoming.map((e) => {
                  const Icon = TYPE_META[e.type].icon;
                  return (
                    <Link
                      key={e.id}
                      to={e.linkTo}
                      className="flex items-center justify-between text-sm rounded-md hover:bg-muted/50 p-1.5 -mx-1.5 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${TYPE_META[e.type].color}`} />
                        <span className="truncate">{e.title}</span>
                      </div>
                      <span
                        className={`shrink-0 text-xs ${e.overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                      >
                        {format(new Date(e.date), "MMM d")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" /> Employee events
            </h3>
            <p className="text-sm text-muted-foreground">
              Birthdays, work anniversaries, and leave will show up here once the HR module is built
              out. Nothing to fake in the meantime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
