import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { hasCompletedOnboarding } from "@/lib/auth-flow";

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
    // Onboarding is complete iff the user has at least one company membership.
    // `create_company` only inserts that row after all setup succeeds, so it's
    // the ground truth — `onboarding_progress.completed` is a cache that we
    // self-heal from this check.
    const done = await hasCompletedOnboarding(data.user.id);
    if (!done) {
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
          <MobileHeader />
          <header className="hidden lg:flex h-12 items-center gap-2 border-b bg-card px-3 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
