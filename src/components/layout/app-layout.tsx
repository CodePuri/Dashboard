"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PanelProvider } from "@/hooks/use-panel-state";
import { AppSidebar } from "./app-sidebar";
import { ChatPanel } from "./chat-panel";
import { MainContent } from "./main-content";

export function AppLayout() {
  return (
    <PanelProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-[100dvh] w-full overflow-x-hidden bg-background">
          <MainContent />
          <ChatPanel />
        </div>
      </TooltipProvider>
    </PanelProvider>
  );
}
