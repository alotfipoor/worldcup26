"use client";

import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

export default function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 bg-background/80 backdrop-blur-md border-b border-border">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="KickPick" width={28} height={28} style={{ height: "auto" }} />
        <span className="font-bold text-sm tracking-tight">KickPick</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
