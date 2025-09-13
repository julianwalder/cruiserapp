'use client';

import { createContext, useContext, ReactNode } from 'react';

interface SidebarContextType {
  isSidebarCollapsed: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children, isSidebarCollapsed }: { children: ReactNode; isSidebarCollapsed: boolean }) {
  return (
    <SidebarContext.Provider value={{ isSidebarCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
