'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Check, AlertCircle, CalendarClock, Users } from 'lucide-react';
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
import { INTERNAL_ROLES, ROLE_LABELS, type Role } from '@/lib/rbac';
import type { RequirementRow } from '@/lib/employee-documents';

const inputClass =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand';

const CATEGORIES = ['insurance', 'driving', 'agreement', 'tax', 'other'];

type Msg = { type: 'success' | 'error'; text: string } | null;

/**
 * Super-admin management of the document requirement catalog.
 * Requirements are retired via isActive rather than deleted, so documents
 * already uploaded against them stay linked and auditable.
 */
export function RequirementsAdmin() {
  const [rows, setRows] = useState<RequirementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RequirementRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  function flash(m: Msg) {
    setMsg(m);
    if (m) setTimeout(() => setMsg(null), 4000);
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/employee-documents/requirements?includeInactive=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load requirements');
      setRows(data.requirements ?? []);
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(r: RequirementRow) {
    try {
      const res = await fetch(`/api/employee-documents/requirements/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update');
      flash({ type: 'success', text: `${r.name} ${r.isActive ? 'retired' : 'reactivated'}` });
      await load();
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

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

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          What every employee must have on file. Retiring a requirement keeps existing uploads.
        </p>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Requirement
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className={cn(
              'p-4 bg-card border border-border rounded-xl flex items-start justify-between gap-4',
              !r.isActive && 'opacity-60',
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground">
                  {r.category}
                </span>
                {r.requiresExpiry && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-500">
                    <CalendarClock className="w-3 h-3" />
                    expires
                  </span>
                )}
                {!r.isActive && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-500">
                    retired
                  </span>
                )}
              </div>
              {r.description && (
                <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {r.requiredRoles.length === 0
                  ? 'Required of every employee'
                  : `Only: ${r.requiredRoles.map((x) => ROLE_LABELS[x] ?? x).join(', ')}`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setEditing(r)}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => toggleActive(r)}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {r.isActive ? 'Retire' : 'Reactivate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <RequirementModal
          requirement={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async (text) => {
            setCreating(false);
            setEditing(null);
            flash({ type: 'success', text });
            await load();
          }}
        />
      )}
    </>
  );
}

function RequirementModal({
  requirement,
  onClose,
  onSaved,
}: {
  requirement: RequirementRow | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [name, setName] = useState(requirement?.name ?? '');
  const [description, setDescription] = useState(requirement?.description ?? '');
  const [category, setCategory] = useState(requirement?.category ?? 'other');
  const [requiresExpiry, setRequiresExpiry] = useState(requirement?.requiresExpiry ?? false);
  const [roles, setRoles] = useState<Role[]>(requirement?.requiredRoles ?? []);
  const [sortOrder, setSortOrder] = useState(String(requirement?.sortOrder ?? 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError('Name is required.');

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      requiresExpiry,
      requiredRoles: roles,
      sortOrder: Number(sortOrder) || 0,
    };

    setBusy(true);
    try {
      const res = await fetch(
        requirement
          ? `/api/employee-documents/requirements/${requirement.id}`
          : '/api/employee-documents/requirements',
        {
          method: requirement ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      onSaved(requirement ? 'Requirement updated' : 'Requirement added');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {requirement ? 'Edit requirement' : 'Add requirement'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Employees see this in their portal and upload a file against it.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto Insurance"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Description (optional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Current proof of coverage."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Sort order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresExpiry}
              onChange={(e) => setRequiresExpiry(e.target.checked)}
              className="w-4 h-4 accent-[var(--brand)]"
            />
            <span className="text-sm text-foreground">
              Has an expiry date — goes stale automatically when it lapses
            </span>
          </label>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Required of
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Select none to require it of every employee.
            </p>
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 grid grid-cols-2 gap-1">
              {INTERNAL_ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={roles.includes(r)}
                    onChange={(e) =>
                      setRoles((prev) =>
                        e.target.checked ? [...prev, r] : prev.filter((x) => x !== r),
                      )
                    }
                    className="w-3.5 h-3.5 accent-[var(--brand)]"
                  />
                  <span className="text-foreground truncate">{ROLE_LABELS[r] ?? r}</span>
                </label>
              ))}
            </div>
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
            {requirement ? 'Save changes' : 'Add requirement'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
