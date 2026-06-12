"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, Calendar, Trophy, Star, Zap, Settings,
  MoreHorizontal, X, BookOpen, Sun, Moon, LogOut, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const MAIN_NAV = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/matches", icon: Calendar, label: "Matches" },
  { href: "/leaderboard", icon: Trophy, label: "Standings" },
  { href: "/tournament", icon: Star, label: "Winner" },
  { href: "/sidebets", icon: Zap, label: "Bets" },
];

interface MobileNavProps {
  isAdmin?: boolean;
  userName?: string | null;
  userId?: string;
}

export default function MobileNav({ isAdmin, userName, userId }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  const mainItems = isAdmin
    ? [...MAIN_NAV, { href: "/admin", icon: Settings, label: "Admin" }]
    : MAIN_NAV;

  async function logout() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
    toast.success("Logged out");
  }

  return (
    <div ref={menuRef} className="md:hidden">
      {/* Bottom navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center h-[58px] px-2 max-w-lg mx-auto">

          {/* Logo — left */}
          <Link href="/" aria-label="KickPick home" className="flex items-center justify-center w-12 h-12 flex-shrink-0">
            <Image src="/logo.png" alt="KickPick" width={28} height={28} style={{ height: "auto" }} />
          </Link>

          {/* Nav icons — centered */}
          <div className="flex-1 flex items-center justify-center">
            {mainItems.map(({ href, icon: Icon, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 flex-1 h-12 rounded-xl transition-colors text-[9px] font-semibold tracking-wide",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-6 rounded-lg transition-colors",
                    active ? "bg-primary/15" : ""
                  )}>
                    <Icon style={{ width: 19, height: 19 }} className={cn(active && "stroke-[2.5]")} />
                  </div>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* More — right */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl flex-shrink-0 text-[9px] font-semibold tracking-wide transition-colors",
              menuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn("flex items-center justify-center w-8 h-6 rounded-lg transition-colors", menuOpen ? "bg-primary/15" : "")}>
              {menuOpen ? <X style={{ width: 19, height: 19 }} /> : <MoreHorizontal style={{ width: 19, height: 19 }} />}
            </div>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up menu */}
      {menuOpen && (
        <div className="fixed bottom-[58px] left-0 right-0 z-40 bg-background border-t border-border shadow-2xl">
          <div className="px-4 py-3 space-y-0.5 max-w-lg mx-auto">
            <Link
              href="/rules"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname.startsWith("/rules")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <BookOpen size={16} />
              Rules
            </Link>

            {userId && (
              <Link
                href={`/players/${userId}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  pathname === `/players/${userId}`
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <User size={16} />
                {userName ?? "My Profile"}
              </Link>
            )}

            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            )}

            <div className="my-1 h-px bg-border" />

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
