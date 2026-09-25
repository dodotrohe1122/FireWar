"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen w-full p-2 overflow-hidden">
        {children}
      </div>
    </SidebarProvider>
  );
}