import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";

import { TRPCReactProvider } from "~/trpc/react";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { BottomNavigation } from "~/components/bottom-navigation";

export const metadata: Metadata = {
  title: "AI Stock Keeper",
  description: "AI-powered stock management system for 1C ERP integration",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Получаем состояние sidebar из cookies
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState !== "false";

  return (
    <html lang="ru" className={ibmPlexSans.variable}>
      <body className="min-h-screen antialiased">
        <TRPCReactProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset className="pb-14 md:pb-0">
              {children}
            </SidebarInset>
            <BottomNavigation />
          </SidebarProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
