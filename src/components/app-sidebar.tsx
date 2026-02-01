"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackagePlus,
  ClipboardList,
  TrendingUp,
  Package,
  Settings,
  Bell,
  ChevronRight,
  Box,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "~/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Badge } from "~/components/ui/badge";

/**
 * Элемент навигации
 */
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isActive?: boolean;
  items?: { title: string; url: string }[];
}

/**
 * Основные разделы навигации
 */
const mainNavItems: NavItem[] = [
  {
    title: "Дашборд",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Приёмка",
    url: "/intake",
    icon: PackagePlus,
    items: [
      { title: "Новая приёмка", url: "/intake" },
      { title: "История", url: "/intake/history" },
    ],
  },
  {
    title: "Сборка",
    url: "/picking",
    icon: ClipboardList,
    badge: "5",
  },
  {
    title: "Прогноз",
    url: "/forecast",
    icon: TrendingUp,
  },
  {
    title: "Инвентарь",
    url: "/inventory",
    icon: Package,
  },
];

/**
 * Настройки
 */
const settingsNavItems: NavItem[] = [
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
    items: [
      { title: "Алерты", url: "/settings/alerts" },
    ],
  },
];

/**
 * Компонент элемента меню с поддержкой вложенности
 */
function NavMenuItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  
  // Проверяем активность: точное совпадение или начало пути
  const isActive = pathname === item.url || 
    (item.url !== "/" && pathname.startsWith(item.url));
  
  // Для вложенных элементов
  const hasSubItems = item.items && item.items.length > 0;
  const isSubItemActive = item.items?.some(sub => pathname === sub.url);

  if (hasSubItems) {
    return (
      <Collapsible
        asChild
        defaultOpen={isActive || isSubItemActive}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isActive || isSubItemActive}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs group-data-[collapsible=icon]:hidden">
                  {item.badge}
                </Badge>
              )}
              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuSub>
              {item.items?.map((subItem) => (
                <SidebarMenuSubItem key={subItem.url}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === subItem.url}
                  >
                    <Link href={subItem.url}>
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.badge ? `${item.title} (${item.badge})` : item.title} isActive={isActive}>
        <Link href={item.url}>
          <item.icon className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs group-data-[collapsible=icon]:hidden">
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * AppSidebar - главная навигация приложения
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Шапка с логотипом */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="AI Stock Keeper">
              <Link href="/">
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Box className="size-4.5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">AI Stock Keeper</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Warehouse Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Основная навигация */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavMenuItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Настройки */}
        <SidebarGroup>
          <SidebarGroupLabel>Система</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <NavMenuItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Футер */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="Алерты (3)"
              size="lg"
            >
              <Link href="/settings/alerts">
                <Bell className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Алерты</span>
                <Badge 
                  variant="destructive" 
                  className="ml-auto h-5 min-w-5 shrink-0 px-1.5 text-xs group-data-[collapsible=icon]:hidden"
                >
                  3
                </Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
