"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  MessageSquare,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePanelState } from "@/hooks/use-panel-state";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: Home },
  { title: "Chat", href: "#", icon: MessageSquare },
];

// Empty for now as requested
const secondaryNavItems: NavItem[] = [];

function NavButton({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;

  const button = (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 transition-all duration-200",
        collapsed ? "justify-center px-2" : "px-3",
      )}
      asChild
    >
      <Link href={item.href}>
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 text-left">{item.title}</span>}
      </Link>
    </Button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = usePanelState();

  return (
    <>
      {/* Mobile Backdrop */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out font-sans",
          // Mobile styles
          "fixed inset-y-0 left-0 z-50 shadow-2xl md:shadow-none",
          sidebarCollapsed ? "-translate-x-full" : "translate-x-0 w-64",
          // Desktop styles
          "md:relative md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-64",
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            "flex h-16 items-center border-b px-4",
            sidebarCollapsed
              ? "md:justify-center justify-start gap-3"
              : "gap-3",
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          {/* Show title if open on mobile OR open on desktop */}
          {(!sidebarCollapsed || (sidebarCollapsed && false)) && (
            <div
              className={cn(
                "flex flex-col",
                sidebarCollapsed ? "md:hidden" : "",
              )}
            >
              <span className="text-lg font-bold text-foreground">
                Analytics
              </span>
              <span className="text-[10px] text-muted-foreground">
                Dashboard
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-1">
            {mainNavItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                collapsed={sidebarCollapsed}
              />
            ))}
          </nav>

          <Separator className="my-4" />

          <nav className="flex flex-col gap-1">
            {secondaryNavItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                collapsed={sidebarCollapsed}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Theme toggle at bottom */}
        <div className="border-t p-2">
          <div
            className={cn(
              "flex items-center rounded-lg p-2 gap-2",
              sidebarCollapsed
                ? "md:justify-center justify-start"
                : "justify-between",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2",
                sidebarCollapsed ? "md:hidden" : "flex",
              )}
            >
              <span className="text-sm text-muted-foreground">Theme</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Collapse toggle button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </>
  );
}
