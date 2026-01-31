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
        <SidebarInset className="min-w-0">
          <header className="flex h-12 sm:h-14 shrink-0 items-center gap-2 px-3 sm:px-4 safe-area-inset">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1 min-w-0" />
          </header>
          <main className="flex-1 overflow-auto overflow-x-hidden p-3 sm:p-4 md:p-6 min-w-0">
            {children}
          </main>
        </SidebarInset>
        <ChatPanel />
      </SidebarProvider>
    </PanelProvider>
  );
}
