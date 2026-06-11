import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KickPick",
  description: "Pick your result before the kick-off.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession().catch(() => null);
  const isLoggedIn = !!session;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground">
        {isLoggedIn ? (
          <div className="flex h-full">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:w-52 lg:w-60 flex-col flex-shrink-0 border-r border-border bg-card sticky top-0 h-screen overflow-y-auto">
              <Sidebar
                isAdmin={session.user.role === "ADMIN"}
                userName={session.user.name}
                userId={session.userId}
              />
            </aside>

            {/* Main scrollable area */}
            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-2xl">
                  {children}
                </div>
              </div>
            </div>
          </div>
        ) : (
          children
        )}

        {/* Mobile bottom nav */}
        {isLoggedIn && (
          <BottomNav isAdmin={session.user.role === "ADMIN"} />
        )}

        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
