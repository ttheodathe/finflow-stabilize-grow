import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { hasCompletedOnboarding } from "@/lib/auth-flow";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async ({ location }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
