import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
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

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const { data, count } = await (supabase as any)
      .from("notifications")
      .select("id,type,title,body,link,read_at,created_at", { count: "exact" })
      .eq("user_id", userRes.user.id)
      .is("read_at", null);
    setUnreadCount(count ?? 0);

    const { data: recent } = await (supabase as any)
      .from("notifications")
      .select("id,type,title,body,link,read_at,created_at")
      .eq("user_id", userRes.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setItems((recent ?? []) as Notification[]);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && unreadCount > 0) {
      // Mark everything currently unread as read the moment the dropdown
      // opens — matches how most notification inboxes behave (opening the
      // list is the "seen" signal), rather than requiring a per-item click.
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userRes.user.id)
        .is("read_at", null);
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  function handleItemClick(n: Notification) {
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleItemClick(n)}
                className="flex flex-col items-start gap-0.5 whitespace-normal py-2"
              >
                <div className="flex w-full items-center gap-1.5">
                  {!n.read_at && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                {n.body && (
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                )}
                <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
