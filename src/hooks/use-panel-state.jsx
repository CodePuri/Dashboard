"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

const PanelContext = createContext(undefined);

const STORAGE_KEY = "panel-state";

export function PanelProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true); // Default to closed (collapsed)
  const [mounted, setMounted] = useState(false);

  // Load state from localStorage on mount (sidebar only - chat always starts closed)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSidebarCollapsed(parsed.sidebarCollapsed);
        // Don't restore chatCollapsed - always start with chat closed
      } catch (e) {
        console.error("Failed to parse panel state", e);
      }
    }
    setMounted(true);
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    if (mounted) {
      const state = { sidebarCollapsed, chatCollapsed };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [sidebarCollapsed, chatCollapsed, mounted]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleChat = useCallback(() => {
    setChatCollapsed((prev) => !prev);
  }, []);

  const value = {
    sidebarCollapsed,
    chatCollapsed,
    setSidebarCollapsed,
    setChatCollapsed,
    toggleSidebar,
    toggleChat,
  };

  return (
    <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
  );
}

export function usePanelState() {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error("usePanelState must be used within a PanelProvider");
  }
  return context;
}
