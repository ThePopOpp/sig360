'use client';

import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  status?: 'working' | 'thinking' | 'sleeping';
}

export function DashboardLayout({ children, status = 'sleeping' }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-900">
      <Sidebar status={status} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
