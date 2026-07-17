import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({
        to: "/auth",
        search: { mode: "login", next: location.pathname },
      });
    }
    if (!data.user.email_confirmed_at) {
      throw redirect({
        to: "/verify-email",
        search: { email: data.user.email ?? undefined },
      });
    }
    // Onboarding gate — skip check on the onboarding route itself.
    const [progress, membership] = await Promise.all([
      supabase
        .from("onboarding_progress")
        .select("completed")
        .eq("user_id", data.user.id)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle(),
    ]);
    const isComplete = progress.data?.completed === true && Boolean(membership.data);
    if (!isComplete) {
      throw redirect({ to: "/onboarding" });
    }
    return { user: data.user };
  },
  component: AppShell,
});

function AppShell() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-2 border-b bg-card px-3 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
