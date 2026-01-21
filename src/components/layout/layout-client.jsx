"use client";

import * as React from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PanelProvider } from "@/hooks/use-panel-state";
import { ChatPanel } from "@/components/layout/chat-panel";

export function LayoutClient({ children }) {
  return (
    <PanelProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
        <ChatPanel />
      </SidebarProvider>
    </PanelProvider>
  );
}
