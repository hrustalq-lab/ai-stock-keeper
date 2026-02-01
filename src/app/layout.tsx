import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";

import { TRPCReactProvider } from "~/trpc/react";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";

export const metadata: Metadata = {
  title: "AI Stock Keeper",
  description: "AI-powered stock management system for 1C ERP integration",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Получаем состояние sidebar из cookies
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState !== "false";

  return (
    <html lang="ru" className={geist.variable}>
      <body className="min-h-screen antialiased">
        <TRPCReactProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset>
              {children}
            </SidebarInset>
          </SidebarProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
