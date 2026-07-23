'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * One-at-a-time accordion. The original used <details> plus a toggle listener
 * that closed the others; controlled state gives the same behaviour without
 * fighting native <details> open state.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q} className="border-b border-border">
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="w-full text-left bg-transparent border-0 cursor-pointer py-5 flex justify-between gap-4 items-center font-display text-[1.05rem] font-semibold"
            >
              {item.q}
              <span
                className={cn(
                  'flex-none grid place-items-center w-[26px] h-[26px] rounded-full border border-border text-brand transition-transform duration-200',
                  open && 'rotate-45',
                )}
              >
                <Plus className="w-3.5 h-3.5" />
              </span>
            </button>
            {open && (
              <div className="pb-5 text-muted-foreground text-[.95rem] max-w-[60ch]">{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
