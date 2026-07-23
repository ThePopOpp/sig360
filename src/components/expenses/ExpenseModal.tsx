'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import type { ExpenseRow, ExpenseCategory, MileageRateRow } from '@/lib/expenses';
import { CATEGORY_LABELS, formatCents } from './format';

const CATEGORIES: ExpenseCategory[] = ['mileage', 'meals', 'travel', 'lodging', 'supplies', 'other'];

const inputClass =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand';

interface Props {
  expense: ExpenseRow | null;
  /** The rate that applies today — used to preview mileage reimbursement. */
  currentRate: MileageRateRow | null;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export function ExpenseModal({ expense, currentRate, onSave, onClose }: Props) {
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'mileage');
  const [expenseDate, setExpenseDate] = useState(
    expense?.expenseDate ?? new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(expense?.description ?? '');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [miles, setMiles] = useState(expense?.miles != null ? String(expense.miles) : '');
  const [fromLocation, setFromLocation] = useState(expense?.fromLocation ?? '');
  const [toLocation, setToLocation] = useState(expense?.toLocation ?? '');
  const [amount, setAmount] = useState(
    expense?.amountCents != null ? (expense.amountCents / 100).toFixed(2) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMileage = category === 'mileage';

  // An entry being edited keeps the rate it was created with; a new one
  // previews against today's rate.
  const rateCents = expense?.rateCents ?? currentRate?.rateCents ?? null;

  const preview = useMemo(() => {
    if (!isMileage || !rateCents) return null;
    const m = Number(miles);
    if (!Number.isFinite(m) || m <= 0) return null;
    return Math.round(m * rateCents);
  }, [isMileage, miles, rateCents]);

  useEffect(() => {
    setError(null);
  }, [category]);

  async function handleSubmit() {
    setError(null);

    if (!description.trim()) return setError('Add a short description.');
    if (isMileage) {
      const m = Number(miles);
      if (!Number.isFinite(m) || m <= 0) return setError('Enter the miles driven.');
      if (!rateCents) return setError('No mileage rate is configured. Ask an admin to set one.');
    } else {
      const a = Number(amount);
      if (!Number.isFinite(a) || a < 0) return setError('Enter a valid amount.');
    }

    const body: Record<string, unknown> = {
      category,
      expenseDate,
      description: description.trim(),
      notes: notes.trim() || null,
    };
    if (isMileage) {
      body.miles = Number(miles);
      body.fromLocation = fromLocation.trim() || null;
      body.toLocation = toLocation.trim() || null;
    } else {
      body.amountCents = Math.round(Number(amount) * 100);
    }

    setSaving(true);
    try {
      await onSave(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {expense ? 'Edit expense' : 'Log an expense'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isMileage
              ? 'Mileage is reimbursed at the rate in force on the trip date.'
              : 'Enter the amount you paid out of pocket.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Purpose</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isMileage ? 'Client meeting — Smith household' : 'What was this for?'}
              className={inputClass}
            />
          </div>

          {isMileage ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">From</label>
                  <input
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="Office"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">To</label>
                  <input
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    placeholder="Client site"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Miles</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  placeholder="0.0"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {rateCents ? (
                    <>
                      At {rateCents}¢/mile
                      {preview !== null && (
                        <>
                          {' → '}
                          <span className="text-brand font-medium">{formatCents(preview)}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-red-500">No mileage rate configured.</span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={cn(inputClass, 'resize-none')}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {expense ? 'Save changes' : 'Add expense'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
