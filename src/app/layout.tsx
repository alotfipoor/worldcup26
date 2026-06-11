import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KickPick",
  description: "Pick your result before the kick-off.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1421" },
  ],
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
      className={`${spaceGrotesk.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground antialiased">
        <ThemeProvider>
          {isLoggedIn ? (
            <div className="flex h-full">
              {/* Desktop sidebar */}
              <aside className="hidden md:flex md:w-52 lg:w-60 flex-col flex-shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen overflow-y-auto">
                <Sidebar
                  isAdmin={session.user.role === "ADMIN"}
                  userName={session.user.name}
                  userId={session.userId}
                />
              </aside>

              {/* Main area */}
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

          {isLoggedIn && (
            <BottomNav isAdmin={session.user.role === "ADMIN"} />
          )}

          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
