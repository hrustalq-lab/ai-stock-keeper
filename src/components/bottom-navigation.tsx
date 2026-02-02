"use client";

/**
 * BottomNavigation - мобильная навигация внизу экрана
 * Issue #2: Bottom Navigation Bar (mobile)
 * Показывается только на экранах < 768px
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackagePlus,
  ClipboardList,
  TrendingUp,
  Menu,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: "Дашборд",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Приёмка",
    href: "/intake",
    icon: PackagePlus,
  },
  {
    title: "Сборка",
    href: "/picking",
    icon: ClipboardList,
  },
  {
    title: "Прогноз",
    href: "/forecast",
    icon: TrendingUp,
  },
  {
    title: "Меню",
    href: "/settings/alerts",
    icon: Menu,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex h-14 items-center justify-around pb-safe">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "size-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
