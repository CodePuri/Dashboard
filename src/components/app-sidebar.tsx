"use client";

import * as React from "react";
import {
  Activity,
  BarChart3,
  Gauge,
  Heart,
  Target,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

// Menu items per V2 spec
const items = [
  {
    title: "Overview",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Value / ROI",
    url: "/roi",
    icon: TrendingUp,
  },
  {
    title: "Activity",
    url: "/activity",
    icon: Zap,
  },
  {
    title: "Acquisition",
    url: "/acquisition",
    icon: UserPlus,
  },
  {
    title: "Engagement",
    url: "/engagement",
    icon: Activity,
  },
  {
    title: "Retention",
    url: "/retention",
    icon: Users,
  },
  {
    title: "Conversion",
    url: "/conversion",
    icon: Target,
  },
  {
    title: "Attrition / Churn",
    url: "/attrition",
    icon: UserMinus,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2 transition-all group-data-[collapsible=icon]:!p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="size-4" />
          </div>
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            Velocity
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2 flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center">
          <ThemeToggle />
          <SidebarTrigger />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
