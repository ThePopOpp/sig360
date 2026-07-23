'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Car,
  Clock,
  CheckCircle2,
  DollarSign,
  Send,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseModal } from '@/components/expenses/ExpenseModal';
import { MileageRatesAdmin } from '@/components/expenses/MileageRatesAdmin';
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatCents,
  formatDate,
} from '@/components/expenses/format';
import { PERMISSIONS } from '@/lib/rbac';
import { useAuth } from '@/contexts/AuthContext';
import type { ExpenseRow, ExpenseStatus, ExpenseSummary, MileageRateRow } from '@/lib/expenses';

type Msg = { type: 'success' | 'error'; text: string } | null;

interface ExpensesResponse {
  expenses: ExpenseRow[];
  summary: ExpenseSummary;
  canViewAll: boolean;
  canApprove: boolean;
  canReimburse: boolean;
}

export default function ExpensesPage() {
  const { can } = useAuth();
  const canManageRates = can(PERMISSIONS.EXPENSES_MANAGE_RATES);
  const [mine, setMine] = useState<ExpensesResponse | null>(null);
  const [pending, setPending] = useState<ExpenseRow[]>([]);
  const [rate, setRate] = useState<MileageRateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  function flash(m: Msg) {
    setMsg(m);
    if (m) setTimeout(() => setMsg(null), 4000);
  }

  const load = useCallback(async () => {
    try {
      const [mineRes, rateRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/expenses/rates'),
      ]);
      const mineData = await mineRes.json();
      if (!mineRes.ok) throw new Error(mineData.error || 'Could not load expenses');
      setMine(mineData);

      if (rateRes.ok) {
        const rateData = await rateRes.json();
        setRate(rateData.current ?? null);
      }

      // Approvers get a second list: everyone's submitted entries.
      if (mineData.canApprove) {
        const res = await fetch('/api/expenses?scope=all&status=submitted');
        if (res.ok) {
          const data = await res.json();
          setPending(data.expenses ?? []);
        }
      }
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(body: Record<string, unknown>) {
    const url = editing ? `/api/expenses/${editing.id}` : '/api/expenses';
    const res = await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save');
    setShowModal(false);
    setEditing(null);
    flash({ type: 'success', text: editing ? 'Expense updated' : 'Expense logged' });
    await load();
  }

  async function setStatus(id: string, status: ExpenseStatus, note?: string) {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update');
      flash({ type: 'success', text: `Expense ${STATUS_LABELS[status].toLowerCase()}` });
      await load();
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete');
      flash({ type: 'success', text: 'Expense deleted' });
      await load();
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    }
  }

  async function reject(id: string) {
    const note = prompt('Reason for rejecting this expense?');
    if (note === null) return;
    await setStatus(id, 'rejected', note);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  const summary = mine?.summary;
  const awaiting = summary?.byStatus.submitted;
  const approved = summary?.byStatus.approved;
  const reimbursed = summary?.byStatus.reimbursed;

  // Tabs only earn their keep once there's more than the personal log to show.
  const showTabs = Boolean(mine?.canApprove) || canManageRates;

  const myTable = (
    <ExpenseTable
      rows={mine?.expenses ?? []}
      emptyText="You haven't logged any expenses yet."
      onEdit={(e) => {
        setEditing(e);
        setShowModal(true);
      }}
      onDelete={remove}
      onSubmit={(id) => setStatus(id, 'submitted')}
    />
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Log mileage and out-of-pocket costs for reimbursement
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Expense
        </button>
      </div>

      {msg && (
        <div
          className={cn(
            'mb-6 p-4 rounded-lg flex items-center gap-2',
            msg.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-500'
              : 'bg-red-500/10 border border-red-500/30 text-red-500',
          )}
        >
          {msg.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {msg.text}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Miles logged"
          icon={Car}
          value={summary ? summary.mileageMiles.toLocaleString() : '0'}
          hint={rate ? `at ${rate.rateCents}¢/mile` : 'no rate configured'}
        />
        <StatCard
          title="Awaiting review"
          icon={Clock}
          value={awaiting ? formatCents(awaiting.totalCents) : '$0.00'}
          hint={`${awaiting?.count ?? 0} ${awaiting?.count === 1 ? 'entry' : 'entries'}`}
          valueClass={awaiting && awaiting.count > 0 ? 'text-blue-500' : undefined}
        />
        <StatCard
          title="Approved"
          icon={CheckCircle2}
          value={approved ? formatCents(approved.totalCents) : '$0.00'}
          hint="not yet paid out"
          valueClass={approved && approved.count > 0 ? 'text-green-500' : undefined}
        />
        <StatCard
          title="Reimbursed"
          icon={DollarSign}
          value={reimbursed ? formatCents(reimbursed.totalCents) : '$0.00'}
          hint="paid to date"
        />
      </div>

      {showTabs ? (
        <Tabs defaultValue="mine">
          <TabsList className="mb-4">
            <TabsTrigger value="mine">My expenses</TabsTrigger>
            {mine?.canApprove && (
              <TabsTrigger value="approvals">
                Approvals{pending.length > 0 ? ` (${pending.length})` : ''}
              </TabsTrigger>
            )}
            {canManageRates && <TabsTrigger value="rates">Mileage rates</TabsTrigger>}
          </TabsList>

          <TabsContent value="mine">{myTable}</TabsContent>

          {mine?.canApprove && (
            <TabsContent value="approvals">
              <ExpenseTable
                rows={pending}
                showOwner
                emptyText="Nothing is waiting for review."
                onApprove={(id) => setStatus(id, 'approved')}
                onReject={reject}
                onReimburse={mine.canReimburse ? (id) => setStatus(id, 'reimbursed') : undefined}
              />
            </TabsContent>
          )}

          {canManageRates && (
            <TabsContent value="rates">
              <MileageRatesAdmin />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        myTable
      )}

      {showModal && (
        <ExpenseModal
          expense={editing}
          currentRate={rate}
          onSave={save}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  valueClass,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: typeof Car;
  valueClass?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold text-foreground', valueClass)}>{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

interface TableProps {
  rows: ExpenseRow[];
  emptyText: string;
  showOwner?: boolean;
  onEdit?: (e: ExpenseRow) => void;
  onDelete?: (id: string) => void;
  onSubmit?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onReimburse?: (id: string) => void;
}

function ExpenseTable({
  rows,
  emptyText,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onReimburse,
}: TableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
        <p className="text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Purpose</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
              >
                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(r.expenseDate)}
                </td>
                <td className="p-4">
                  <p className="text-sm text-foreground">{r.description}</p>
                  {r.category === 'mileage' && (r.fromLocation || r.toLocation) && (
                    <p className="text-xs text-muted-foreground">
                      {r.fromLocation || '—'} → {r.toLocation || '—'}
                    </p>
                  )}
                  {r.status === 'rejected' && r.reviewNote && (
                    <p className="text-xs text-red-500 mt-1">Rejected: {r.reviewNote}</p>
                  )}
                </td>
                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                  {CATEGORY_LABELS[r.category]}
                  {r.category === 'mileage' && r.miles != null && (
                    <span className="text-xs"> · {r.miles} mi</span>
                  )}
                </td>
                <td className="p-4 text-sm text-foreground text-right font-medium whitespace-nowrap">
                  {formatCents(r.totalCents)}
                </td>
                <td className="p-4">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
                      STATUS_COLORS[r.status],
                    )}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    {onSubmit && (r.status === 'draft' || r.status === 'rejected') && (
                      <IconButton title="Submit for review" onClick={() => onSubmit(r.id)}>
                        <Send className="w-4 h-4" />
                      </IconButton>
                    )}
                    {onEdit && (r.status === 'draft' || r.status === 'rejected') && (
                      <IconButton title="Edit" onClick={() => onEdit(r)}>
                        <Edit className="w-4 h-4" />
                      </IconButton>
                    )}
                    {onDelete && (r.status === 'draft' || r.status === 'rejected') && (
                      <IconButton title="Delete" danger onClick={() => onDelete(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    )}
                    {onApprove && r.status === 'submitted' && (
                      <IconButton title="Approve" onClick={() => onApprove(r.id)}>
                        <Check className="w-4 h-4" />
                      </IconButton>
                    )}
                    {onReject && r.status === 'submitted' && (
                      <IconButton title="Reject" danger onClick={() => onReject(r.id)}>
                        <X className="w-4 h-4" />
                      </IconButton>
                    )}
                    {onReimburse && r.status === 'approved' && (
                      <IconButton title="Mark reimbursed" onClick={() => onReimburse(r.id)}>
                        <DollarSign className="w-4 h-4" />
                      </IconButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg transition-colors text-muted-foreground hover:bg-secondary',
        danger ? 'hover:text-red-500' : 'hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
