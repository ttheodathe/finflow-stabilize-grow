import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  Package,
  ShoppingCart,
  Building2,
  Briefcase,
  Landmark,
  Calendar,
  BookOpen,
  AppWindow,
  ChevronDown,
  Sparkles,
  Wallet,
  Plug,
  Settings as SettingsIcon,
  Search,
  ChevronsUpDown,
  Check,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { CreateCompanyModal } from "@/components/CreateCompanyModal";

type NavItem = { label: string; to: string };
type NavGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  items?: NavItem[];
};

// Plan tiers. The source of truth is now the `subscriptions` table
// (company_limit = null means unlimited / enterprise).
const PLAN_ORDER = ["free", "pro", "business", "enterprise"] as const;

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Professional",
  business: "Business",
  enterprise: "Enterprise",
};

const navGroups: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Companies", icon: Building2, to: "/companies" },
  {
    label: "Items",
    icon: Package,
    items: [
      { label: "Products", to: "/items/products" },
      { label: "Services", to: "/items/services" },
      { label: "Categories", to: "/items/categories" },
      { label: "Inventory", to: "/items/inventory" },
      { label: "Stock movements", to: "/items/stock-movements" },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    items: [
      { label: "Invoices", to: "/invoices" },
      { label: "Customers", to: "/customers" },
      { label: "Estimates", to: "/sales/estimates" },
      { label: "Recurring invoices", to: "/sales/recurring" },
      { label: "Credit notes", to: "/sales/credit-notes" },
      { label: "Payments received", to: "/sales/payments" },
    ],
  },
  {
    label: "Purchases",
    icon: Briefcase,
    items: [
      { label: "Bills", to: "/purchases/bills" },
      { label: "Vendors", to: "/purchases/vendors" },
      { label: "Purchase orders", to: "/purchases/orders" },
      { label: "Expenses", to: "/expenses" },
    ],
  },
  {
    label: "HR",
    icon: Users,
    items: [
      { label: "Employees", to: "/hr/employees" },
      { label: "Expense claims", to: "/hr/claims" },
      { label: "Departments", to: "/hr/departments" },
      { label: "Leave management", to: "/hr/leave" },
    ],
  },
  {
    label: "Banking",
    icon: Landmark,
    items: [
      { label: "Accounts", to: "/banking/accounts" },
      { label: "Bank feeds", to: "/banking/feeds" },
      { label: "Transactions", to: "/banking/transactions" },
      { label: "Transfers", to: "/banking/transfers" },
      { label: "Reconciliations", to: "/banking/reconciliations" },
    ],
  },
  {
    label: "Accounting",
    icon: BookOpen,
    items: [
      { label: "Chart of accounts", to: "/accounting/chart" },
      { label: "Journal entries", to: "/accounting/journals" },
      { label: "General ledger", to: "/accounting/ledger" },
      { label: "Trial balance", to: "/accounting/trial-balance" },
    ],
  },
  {
    // Placeholder routes — adjust to match your actual Payroll module once built.
    label: "Payroll",
    icon: Wallet,
    items: [
      { label: "Pay runs", to: "/payroll/pay-runs" },
      { label: "Payslips", to: "/payroll/payslips" },
      { label: "Payroll settings", to: "/payroll/settings" },
    ],
  },
  { label: "Reports", icon: BarChart3, to: "/reports" },
  { label: "Calendar", icon: Calendar, to: "/calendar" },
  { label: "AI Bookkeeper", icon: Sparkles, to: "/ai-bookkeeper" },
  { label: "Apps", icon: AppWindow, to: "/apps" },
  // Mapped to the existing External Sync route — rename if you want a dedicated /integrations page.
  { label: "Integrations", icon: Plug, to: "/sync" },
  { label: "Settings", icon: SettingsIcon, to: "/settings" },
];

type Company = { id: string; name: string; is_default: boolean };
type Subscription = { plan: string; company_limit: number | null };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const planKey = subscription?.plan ?? "free";
  const planLabel = PLAN_LABELS[planKey] ?? planKey;
  const companyLimit = subscription?.company_limit ?? null; // null = unlimited
  const companiesUsed = companies.length;
  const usagePct =
    companyLimit === null ? 100 : Math.min(100, (companiesUsed / companyLimit) * 100);

  useEffect(() => {
    loadUserAndCompanies();
  }, []);

  async function loadUserAndCompanies() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email ?? "");

const [{ data: profile }, { data: memberRows }, { data: subRow }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
      supabase
        .from("company_members")
        .select("company:companies(id, name, is_default, created_at)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { referencedTable: "companies", ascending: true }),
      supabase
        .from("subscriptions")
        .select("plan, company_limit")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);

    const list = (memberRows ?? [])
      .map((r: any) => r.company)
      .filter(Boolean) as Company[];
    setCompanies(list);

    const storedId =
      typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null;
    const active = list.find((c) => c.id === storedId) ?? list.find((c) => c.is_default) ?? list[0];

    if (active) setCurrentCompanyId(active.id);

    if (subRow) {
      setSubscription(subRow);
    } else {
      // Safety net: the subscriptions table has a trigger that creates a
      // free row for every new signup, but if this account predates that
      // trigger (or the row was somehow deleted), create it here instead
      // of leaving the plan section blank.
      const { data: created } = await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, plan: "free", company_limit: 1 }, { onConflict: "user_id" })
        .select("plan, company_limit")
        .single();
      if (created) setSubscription(created);
    }
  }

  // Demo upgrade flow: cycles to the next tier via the update_own_plan RPC,
  // which is the only way plan changes are allowed to persist (see the
  // migration — there's no client-side UPDATE policy on subscriptions).
  // Replace this with your real Stripe/Flutterwave checkout + webhook once
  // billing is built; the webhook should call the same RPC (or update the
  // row directly with the service role).
  async function handleUpgradeClick() {
    const currentIndex = PLAN_ORDER.indexOf(planKey as (typeof PLAN_ORDER)[number]);
    const nextPlan = PLAN_ORDER[currentIndex + 1];

    if (!nextPlan) {
      toast.info("You're already on the top tier.");
      return;
    }

    setUpgrading(true);
    const { data, error } = await supabase.rpc("update_own_plan", { new_plan: nextPlan });
    setUpgrading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      setSubscription({ plan: data.plan, company_limit: data.company_limit });
      toast.success(`Upgraded to ${PLAN_LABELS[data.plan]}`);
    }
  }

  function switchCompany(id: string) {
    setCurrentCompanyId(id);
    localStorage.setItem("currentCompanyId", id);
    window.dispatchEvent(new CustomEvent("company-changed", { detail: { companyId: id } }));
    const company = companies.find((c) => c.id === id);
    if (company) toast.success(`Switched to ${company.name}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", search: { mode: "login" } });
  }

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const currentCompany = companies.find((c) => c.id === currentCompanyId);

  const initials = (fullName || email || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Simple client-side filter over nav items for the search box.
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    const flat: NavItem[] = [];
    for (const g of navGroups) {
      if (g.to && g.label.toLowerCase().includes(q)) flat.push({ label: g.label, to: g.to });
      if (g.items) {
        for (const i of g.items) {
          if (i.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)) {
            flat.push({ label: `${g.label} · ${i.label}`, to: i.to });
          }
        }
      }
    }
    return flat.slice(0, 8);
  }, [search]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-hero flex items-center justify-center text-white font-bold text-sm shrink-0">
            FF
          </div>
          {!collapsed && (
            <span className="font-bold text-base gradient-text">FreeFlow Accounts</span>
          )}
        </Link>
      </SidebarHeader>

      {/* Company switcher */}
      {!collapsed && (
        <div className="border-b px-2 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors text-left">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {currentCompany?.name ?? "No company yet"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{planLabel}</p>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Switch company</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => switchCompany(c.id)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === currentCompanyId && <Check className="h-4 w-4 text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}
<DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateCompanyOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <CreateCompanyModal
        open={createCompanyOpen}
        onOpenChange={setCreateCompanyOpen}
        onCreated={async (newCompanyId) => {
          await loadUserAndCompanies();
          switchCompany(newCompanyId);
        }}
      />

      {/* Search */}
      {!collapsed && (
        <div className="px-2 py-2 border-b relative">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="pl-8 h-8 text-sm"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute left-2 right-2 mt-1 rounded-md border bg-popover shadow-md z-50 overflow-hidden">
              {searchResults.map((r) => (
                <button
                  key={r.to}
                  onClick={() => {
                    navigate({ to: r.to });
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors truncate"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navGroups.map((g) => {
                if (!g.items) {
                  return (
                    <SidebarMenuItem key={g.label}>
                      <SidebarMenuButton asChild isActive={isActive(g.to!)} tooltip={g.label}>
                        <Link to={g.to!}>
                          <g.icon className="h-4 w-4" />
                          <span>{g.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                const open = g.items.some((i) => isActive(i.to));
                return (
                  <Collapsible key={g.label} defaultOpen={open} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={g.label}>
                          <g.icon className="h-4 w-4" />
                          <span>{g.label}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {g.items.map((i) => (
                            <SidebarMenuSubItem key={i.to}>
                              <SidebarMenuSubButton asChild isActive={isActive(i.to)}>
                                <Link to={i.to}>{i.label}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Plan</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="mx-2 rounded-lg border bg-gradient-to-br from-primary/10 to-secondary/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3 w-3" /> {planLabel} plan
                </div>
                {!collapsed && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {companyLimit === null ? "Unlimited" : `${companiesUsed}/${companyLimit}`}
                  </Badge>
                )}
              </div>
              {!collapsed && (
                <>
                  <Progress value={usagePct} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {companiesUsed}/{companyLimit === null ? "∞" : companyLimit} companies
                  </p>
                  {planKey !== "enterprise" && (
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      disabled={upgrading}
                      onClick={handleUpgradeClick}
                    >
                      {upgrading ? "Upgrading…" : "Upgrade"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors text-left">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{fullName || "Your account"}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
