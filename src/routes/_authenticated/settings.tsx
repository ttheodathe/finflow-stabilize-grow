import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SettingsPage } from "@/components/settings-page";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Free Accounting" }] }),
  loader: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return { userId: user.id };
  },
  component: SettingsRoute,
});

function SettingsRoute() {
  const { userId } = Route.useLoaderData();
  return <SettingsPage supabase={supabase} userId={userId} />;
}
