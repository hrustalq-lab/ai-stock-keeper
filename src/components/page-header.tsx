"use client";

import * as React from "react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

/**
 * PageHeader - универсальный заголовок страницы
 * Включает: sidebar trigger, breadcrumbs, заголовок, описание, действия
 * Issue #4: Compact layout
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/60 md:h-12 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-1.5 hidden h-4 sm:block" />

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <>
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Главная</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.label}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 || !item.href ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href}>
                          {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="md:hidden">
              <h1 className="text-sm font-medium">{title}</h1>
            </div>
          </>
        )}

        {/* Title for pages without breadcrumbs */}
        {(!breadcrumbs || breadcrumbs.length === 0) && (
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-sm font-semibold md:text-base">{title}</h1>
            {description && (
              <p className="hidden truncate text-xs text-muted-foreground md:block">
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
