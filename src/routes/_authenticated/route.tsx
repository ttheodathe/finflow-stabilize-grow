import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { NotificationBell } from "@/components/NotificationBell";
import { hasCompletedOnboarding, getPendingPlan } from "@/lib/auth-flow";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async ({ location }) => {
    // getUser() can itself throw synchronously (e.g. the Supabase client
    // failing to construct because VITE_SUPABASE_URL / VITE_SUPABASE_
    // PUBLISHABLE_KEY weren't baked into this build). Previously that
    // exception propagated unhandled and looked identical, from the
    // user's side, to "you're not signed in" — silently bouncing a
    // logged-in user back to /auth with no explanation. Catch it here and
    // fail loudly instead so this class of outage is obvious in the UI
    // and in error reporting rather than masquerading as an auth issue.
    let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
    } catch (err) {
      console.error("[auth] Failed to check session — not treating as signed-out:", err);
      throw err;
    }

    if (!user) {
      throw redirect({
        to: "/auth",
        search: {
          mode: "login",
          next: location.pathname,
        },
      });
    }

    if (!user.email_confirmed_at) {
      throw redirect({
        to: "/verify-email",
        search: {
          email: user.email ?? undefined,
        },
      });
    }

    // A user is considered onboarded once they belong to at least one company.
    const completed = await hasCompletedOnboarding(user.id);

    if (!completed) {
      throw redirect({
        to: "/onboarding",
      });
    }

    // Chose a paid plan but never finished checkout — keep them out of the
    // dashboard (and every other authenticated page) until payment clears.
    const pending = await getPendingPlan(user.id);
    if (pending) {
      throw redirect({ to: "/complete-payment" });
    }

    return { user };
  },

  component: AppShell,
});

function AppShell() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />

      <SidebarInset className="min-h-screen bg-muted/30">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Desktop Header */}
        <header className="sticky top-0 z-30 hidden h-12 items-center gap-2 border-b bg-card px-3 lg:flex">
          <SidebarTrigger />
          <div className="flex-1" />
          <NotificationBell />
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
