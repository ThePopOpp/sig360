'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Check, AlertCircle, Info } from 'lucide-react';
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
import type { MileageRateRow } from '@/lib/expenses';
import { formatDate } from './format';

const inputClass =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand';

type Msg = { type: 'success' | 'error'; text: string } | null;

/**
 * Date-effective mileage rates. A trip is reimbursed at the newest rate whose
 * effective_from is on or before the trip date, so correcting the future never
 * rewrites past claims.
 */
export function MileageRatesAdmin() {
  const [rates, setRates] = useState<MileageRateRow[]>([]);
  const [current, setCurrent] = useState<MileageRateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  function flash(m: Msg) {
    setMsg(m);
    if (m) setTimeout(() => setMsg(null), 4000);
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses/rates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load rates');
      setRates(data.rates ?? []);
      setCurrent(data.current ?? null);
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  const seeded = rates.length === 1 && /seed value/i.test(rates[0].note ?? '');

  return (
    <>
      {msg && (
        <div
          className={cn(
            'mb-6 p-4 rounded-lg flex items-center gap-2',
            msg.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-500'
              : 'bg-red-500/10 border border-red-500/30 text-red-500',
          )}
        >
          {msg.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {seeded && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-500 flex items-start gap-2">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">This is the seeded placeholder rate.</p>
            <p className="mt-0.5">
              It was not verified against the IRS standard mileage rate. Confirm the correct figure
              and add it below before employees log trips.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-foreground">
            Current rate:{' '}
            {current ? (
              <span className="font-medium text-brand">{current.rateCents}¢ / mile</span>
            ) : (
              <span className="text-red-500">none configured</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trips use the rate in force on the trip date — past claims are never rewritten.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Set New Rate
        </button>
      </div>

      {rates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">
            No mileage rate configured. Employees cannot log mileage until you set one.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Effective from
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rate</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Note</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-4 text-sm text-foreground whitespace-nowrap">
                    {formatDate(r.effectiveFrom)}
                    {current?.id === r.id && (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-brand/20 text-brand">
                        in force
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-foreground font-medium whitespace-nowrap">
                    {r.rateCents}¢
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{r.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <RateModal
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            flash({ type: 'success', text: 'Mileage rate saved' });
            await load();
          }}
        />
      )}
    </>
  );
}

function RateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [cents, setCents] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const n = Number(cents);
    if (!Number.isFinite(n) || n <= 0) return setError('Enter a rate in whole cents, e.g. 70.');
    if (!Number.isInteger(n)) return setError('The rate must be a whole number of cents.');

    setBusy(true);
    try {
      const res = await fetch('/api/expenses/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateCents: n, effectiveFrom, note: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Set mileage rate</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Applies to trips on or after the effective date. Re-using an existing date updates that
            rate.
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
              <label className="block text-sm text-muted-foreground mb-1.5">Cents per mile</label>
              <input
                type="number"
                min="1"
                step="1"
                value={cents}
                onChange={(e) => setCents(e.target.value)}
                placeholder="70"
                className={inputClass}
              />
              {Number(cents) > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  100 miles ={' '}
                  <span className="text-brand font-medium">
                    ${((Number(cents) * 100) / 100).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Effective from</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="2026 IRS standard rate"
              className={inputClass}
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
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Save rate
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
