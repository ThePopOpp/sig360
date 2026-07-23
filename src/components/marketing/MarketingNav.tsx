'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/providers/ThemeProvider';

const LINKS = [
  { href: '#solutions', label: 'Solutions' },
  { href: '#approach', label: 'Our Approach' },
  { href: '#pricing', label: 'Membership' },
  { href: '#faq', label: 'FAQ' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="flex items-center justify-between h-[74px]">
          <Link href="/home" className="flex items-center gap-[.55rem] font-display font-bold text-[1.15rem]">
            <span className="grid place-items-center w-[30px] h-[30px] rounded-[9px] bg-brand text-brand-foreground text-[.72rem] font-bold">
              SIG
            </span>
            SIG360
          </Link>

          <nav className="hidden lg:flex gap-[2.1rem] text-[.95rem] font-medium">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="opacity-85 hover:opacity-100 hover:text-brand transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex gap-[.7rem] items-center font-medium">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <Link href="/login" className="hidden lg:block text-[.95rem] px-[.6rem] py-[.4rem] hover:text-brand transition-colors">
              Log in
            </Link>
            <a
              href="#book"
              className="hidden sm:inline-flex items-center gap-2 font-semibold text-[.95rem] px-[1.6rem] py-[.9rem] rounded-full bg-yellow text-yellow-foreground hover:bg-yellow-hover hover:-translate-y-0.5 transition-all"
            >
              Schedule a Consultation
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={open}
              className="lg:hidden p-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer — the original collapses nav + login behind ☰ under 900px. */}
      <div
        className={cn(
          'lg:hidden overflow-hidden border-t border-border transition-[max-height]',
          open ? 'max-h-96' : 'max-h-0 border-t-0',
        )}
      >
        <nav className="mx-auto max-w-[1180px] px-6 py-4 flex flex-col gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-2 text-[.95rem] font-medium hover:text-brand transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link href="/login" className="py-2 text-[.95rem] font-medium hover:text-brand transition-colors">
            Log in
          </Link>
          <a
            href="#book"
            onClick={() => setOpen(false)}
            className="sm:hidden mt-2 inline-flex items-center justify-center gap-2 font-semibold text-[.95rem] px-[1.6rem] py-[.9rem] rounded-full bg-yellow text-yellow-foreground"
          >
            Schedule a Consultation
          </a>
        </nav>
      </div>
    </header>
  );
}
