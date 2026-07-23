'use client';

import { useState } from 'react';
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
  Phone,
  Sun,
  Moon,
  Calendar,
  Users,
  Zap,
  UserPlus,
  FolderKanban,
  DollarSign,
  Home,
  BarChart3,
  FileText,
  Bot,
  ChevronDown,
  ChevronRight,
  X,
  Rocket,
  StickyNote,
  User,
  Globe,
  Shield,
  UserCog,
  CreditCard,
  Plug,
  LogOut,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/rbac';
import { Sig360LogoMark } from '@/components/branding/Sig360LogoMark';

// AI nested items
const aiNavigation = [
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'DNA', href: '/dna', icon: Dna },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'Skills', href: '/skills', icon: Wrench },
  { name: 'Cron', href: '/cron', icon: Clock },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'To-Do', href: '/todos', icon: CheckSquare },
  { name: 'Missions', href: '/missions', icon: ListTodo },
];

// Account nested items
const accountNavigation = [
  { name: 'Profile', href: '/account/profile', icon: User },
  { name: 'Public Profile', href: '/account/public-profile', icon: Globe },
  { name: 'User Settings', href: '/account/user-settings', icon: UserCog },
  { name: 'Security', href: '/account/security', icon: Shield },
  { name: 'Roles & Permissions', href: '/account/roles', icon: Users },
  { name: 'Payment Setup', href: '/account/payment-setup', icon: CreditCard },
];

// Main navigation (flat items). `perm` gates visibility (any-of when an array).
// Items with no `perm` are visible to any authenticated user.
type NavItem = {
  name: string;
  href: string;
  icon: typeof BarChart3;
  perm?: string | string[];
};

const mainNavigation: NavItem[] = [
  { name: 'Analytics', href: '/analytics', icon: BarChart3, perm: PERMISSIONS.REPORTS_VIEW },
  { name: 'Communications', href: '/communications', icon: Phone, perm: PERMISSIONS.COMMS_VIEW },
  { name: 'Clients', href: '/clients', icon: Users, perm: [PERMISSIONS.CLIENTS_VIEW_ALL, PERMISSIONS.CLIENTS_VIEW_ASSIGNED] },
  { name: 'Households', href: '/households', icon: Home, perm: [PERMISSIONS.HOUSEHOLDS_VIEW_ALL, PERMISSIONS.HOUSEHOLDS_VIEW_ASSIGNED] },
  { name: 'Contacts', href: '/contacts', icon: Users, perm: PERMISSIONS.CONTACTS_VIEW },
  { name: 'Leads', href: '/leads', icon: UserPlus, perm: PERMISSIONS.LEADS_VIEW },
  { name: 'Pipeline', href: '/pipeline', icon: DollarSign, perm: PERMISSIONS.LEADS_VIEW },
  { name: 'Projects', href: '/projects', icon: FolderKanban, perm: PERMISSIONS.TASKS_VIEW },
  { name: 'Documents', href: '/documents', icon: FileText, perm: PERMISSIONS.DOCUMENTS_VIEW },
  { name: 'Expenses', href: '/expenses', icon: Receipt, perm: PERMISSIONS.EXPENSES_VIEW_OWN },
  {
    name: 'My Records',
    href: '/employee-documents',
    icon: ShieldCheck,
    perm: PERMISSIONS.EMPLOYEE_DOCS_VIEW_OWN,
  },
  { name: 'Notes', href: '/notes', icon: StickyNote },
  { name: 'Posts', href: '/posts', icon: FileText, perm: PERMISSIONS.MARKETING_VIEW_CAMPAIGNS },
  { name: 'Appointments', href: '/appointments', icon: Calendar, perm: PERMISSIONS.APPOINTMENTS_VIEW },
  { name: 'Automation', href: '/automation', icon: Zap, perm: PERMISSIONS.SETTINGS_MANAGE_AUTOMATIONS },
  { name: 'Integrations', href: '/integrations', icon: Plug, perm: PERMISSIONS.SETTINGS_VIEW },
  { name: 'Deploy', href: '/deploy', icon: Rocket, perm: PERMISSIONS.SETTINGS_EDIT },
  { name: 'Settings', href: '/settings', icon: Settings, perm: PERMISSIONS.SETTINGS_VIEW },
];

interface SidebarProps {
  status?: 'working' | 'thinking' | 'sleeping';
  onClose?: () => void;
}

export function Sidebar({ status = 'sleeping', onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, canAny, loading: authLoading } = useAuth();

  // Until permissions load, show everything (avoids hiding items from admins on
  // first paint). Once loaded, filter by permission. Server still enforces.
  const navReady = !authLoading;
  const visible = (perm?: string | string[]) => {
    if (!perm) return true;
    if (!navReady) return true;
    return canAny(Array.isArray(perm) ? perm : [perm]);
  };
  const visibleMainNav = mainNavigation.filter((item) => visible(item.perm));
  const showAiSection = visible(PERMISSIONS.AI_USE);

  // Check if any AI route is active
  const isAiRouteActive = aiNavigation.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  
  // Check if any Account route is active
  const isAccountRouteActive = accountNavigation.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  
  // Default to expanded if a route is active
  const [aiExpanded, setAiExpanded] = useState(isAiRouteActive);
  const [accountExpanded, setAccountExpanded] = useState(isAccountRouteActive);

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
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <Sig360LogoMark />
          <div>
            <h1 className="text-lg font-bold text-foreground">SIG360</h1>
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
              <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
            </div>
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* AI Section */}
        {showAiSection && (
        <div>
          <button
            onClick={() => setAiExpanded(!aiExpanded)}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isAiRouteActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5" />
              <span>AI</span>
            </div>
            {aiExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {aiExpanded && (
            <div className="mt-1 ml-4 pl-3 border-l border-border space-y-1">
              {aiNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Main Navigation */}
        {visibleMainNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Account Section */}
        <div>
          <button
            onClick={() => setAccountExpanded(!accountExpanded)}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isAccountRouteActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" />
              <span>Account</span>
            </div>
            {accountExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {accountExpanded && (
            <div className="mt-1 ml-4 pl-3 border-l border-border space-y-1">
              {accountNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border space-y-3">
        {/* User info */}
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-brand-foreground">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Theme toggle and version */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">SIG360 v1.0</p>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
