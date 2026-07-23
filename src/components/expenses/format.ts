import type { ExpenseCategory, ExpenseStatus } from '@/lib/expenses';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mileage: 'Mileage',
  meals: 'Meals',
  travel: 'Travel',
  lodging: 'Lodging',
  supplies: 'Supplies',
  other: 'Other',
};

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Rejected',
  reimbursed: 'Reimbursed',
};

/** Semantic status colors, matching the convention used across the dashboard. */
export const STATUS_COLORS: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-500',
  submitted: 'bg-blue-500/20 text-blue-500',
  approved: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
  reimbursed: 'bg-brand/20 text-brand',
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

export function formatDate(iso: string): string {
  // Parse as UTC so a date-only value doesn't shift a day in western zones.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
