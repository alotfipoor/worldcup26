"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Trophy, Star, Settings, LogOut, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/matches", icon: Calendar, label: "Matches" },
  { href: "/leaderboard", icon: Trophy, label: "Standings" },
  { href: "/tournament", icon: Star, label: "Winner" },
  { href: "/rules", icon: BookOpen, label: "Rules" },
];

interface SidebarProps {
  isAdmin?: boolean;
  userName?: string | null;
  userId?: string;
}

export default function Sidebar({ isAdmin, userName, userId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", icon: Settings, label: "Admin" }]
    : NAV_ITEMS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
    toast.success("Logged out");
  }

  return (
    <div className="flex flex-col h-full py-6 px-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-3 mb-8">
        <span className="text-2xl">⚽</span>
        <div>
          <div className="font-bold text-sm leading-tight">KickPick</div>
          <div className="text-[10px] text-muted-foreground leading-tight">WC26 Predictions</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="space-y-1 pt-4 border-t border-border">
        {userId && (
          <Link
            href={`/players/${userId}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {userName?.slice(0, 1).toUpperCase() ?? "?"}
            </div>
            <span className="text-sm font-medium truncate">{userName ?? "Me"}</span>
          </Link>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Sign out
        </button>
      </div>
    </div>
  );
}
