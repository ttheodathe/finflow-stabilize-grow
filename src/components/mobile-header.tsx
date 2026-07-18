import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function MobileHeader() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      setFullName(profile?.full_name ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
    })();
  }, []);

  const initials = (fullName || email || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", search: { mode: "login" } });
  }

  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-2 border-b bg-card px-3 shadow-sm">
      <SidebarTrigger className="h-9 w-9 shrink-0" />
      <Link to="/dashboard" className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-8 w-8 rounded-lg bg-gradient-hero flex items-center justify-center text-white font-bold text-xs shrink-0">
          FF
        </div>
        <span className="font-bold text-sm gradient-text truncate">FreeFlow</span>
      </Link>
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Account menu"
            className="rounded-full shrink-0 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{fullName || email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}