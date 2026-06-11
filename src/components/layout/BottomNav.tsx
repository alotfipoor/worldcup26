"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Trophy, Star, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/matches", icon: Calendar, label: "Matches" },
  { href: "/leaderboard", icon: Trophy, label: "Standings" },
  { href: "/tournament", icon: Star, label: "Winner" },
];

interface BottomNavProps {
  isAdmin?: boolean;
}

export default function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();

  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", icon: Settings, label: "Admin" }]
    : NAV_ITEMS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border">
      <div className="flex items-stretch max-w-lg mx-auto">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide transition-colors min-h-[56px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-6 rounded-lg transition-colors",
                active ? "bg-primary/15" : ""
              )}>
                <Icon className={cn("h-4.5 w-4.5", active && "stroke-[2.5]")} style={{ width: 18, height: 18 }} />
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
