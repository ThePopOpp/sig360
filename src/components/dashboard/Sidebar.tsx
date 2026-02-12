'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Dna,
  Brain,
  Wrench,
  Clock,
  Target,
  CheckSquare,
  ListTodo,
  Settings,
  Flame,
} from 'lucide-react';

const navigation = [
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'DNA', href: '/dna', icon: Dna },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'Skills', href: '/skills', icon: Wrench },
  { name: 'Cron', href: '/cron', icon: Clock },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'To-Do', href: '/todos', icon: CheckSquare },
  { name: 'Missions', href: '/missions', icon: ListTodo },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  status?: 'working' | 'thinking' | 'sleeping';
}

export function Sidebar({ status = 'sleeping' }: SidebarProps) {
  const pathname = usePathname();

  const statusColors = {
    working: 'bg-green-500',
    thinking: 'bg-yellow-500',
    sleeping: 'bg-gray-500',
  };

  const statusLabels = {
    working: 'Working',
    thinking: 'Thinking',
    sleeping: 'Idle',
  };

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-950 border-r border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/20">
          <Flame className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">JDub</h1>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
            <span className="text-xs text-zinc-400">{statusLabels[status]}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">JDub Dashboard v1.0</p>
      </div>
    </div>
  );
}
