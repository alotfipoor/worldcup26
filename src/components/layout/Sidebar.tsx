"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Trophy, Star, Settings, LogOut, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-xl flex-shrink-0">
            ⚽
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-sidebar-foreground">KickPick</div>
            <div className="text-[10px] text-muted-foreground leading-tight">WC26 Predictions</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-sidebar-foreground"
              )}
            >
              <Icon style={{ width: 16, height: 16 }} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 pt-3 border-t border-sidebar-border space-y-1">
        {/* User profile link */}
        {userId && (
          <Link
            href={`/players/${userId}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {userName?.slice(0, 1).toUpperCase() ?? "?"}
            </div>
            <span className="text-sm font-medium truncate text-sidebar-foreground group-hover:text-foreground transition-colors">
              {userName ?? "Me"}
            </span>
          </Link>
        )}

        {/* Theme toggle + logout row */}
        <div className="flex items-center gap-1 px-1">
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex-1 flex items-center gap-2 px-2 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut style={{ width: 15, height: 15 }} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
