'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Upload,
  Download,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Users,
  Check,
  X,
  AlertCircle,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadModal } from '@/components/employee-documents/UploadModal';
import { RequirementsAdmin } from '@/components/employee-documents/RequirementsAdmin';
import {
  STATE_COLORS,
  STATE_LABELS,
  formatDate,
  percentColor,
} from '@/components/employee-documents/state';
import { ROLE_LABELS, PERMISSIONS } from '@/lib/rbac';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ComplianceOverview,
  EmployeeCompliance,
  RequirementRow,
  RequirementState,
} from '@/lib/employee-documents';

type Msg = { type: 'success' | 'error'; text: string } | null;

interface PortalResponse {
  compliance: EmployeeCompliance;
  canVerify: boolean;
  canViewAll: boolean;
  isSelf: boolean;
}

export default function EmployeeDocumentsPage() {
  const { can } = useAuth();
  const canManageRequirements = can(PERMISSIONS.EMPLOYEE_DOCS_MANAGE_REQUIREMENTS);
  const [portal, setPortal] = useState<PortalResponse | null>(null);
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadFor, setUploadFor] = useState<RequirementRow | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(m: Msg) {
    setMsg(m);
    if (m) setTimeout(() => setMsg(null), 4000);
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/employee-documents');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load your documents');
      setPortal(data);

      if (data.canViewAll) {
        const ovRes = await fetch('/api/employee-documents/overview');
        if (ovRes.ok) setOverview(await ovRes.json());
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, status: 'verified' | 'rejected') {
    let note: string | null = null;
    if (status === 'rejected') {
      note = prompt('Why is this document being rejected?');
      if (note === null) return;
    }
    try {
      const res = await fetch(`/api/employee-documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update');
      flash({ type: 'success', text: `Document ${status}` });
      await load();
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this document?')) return;
    try {
      const res = await fetch(`/api/employee-documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not remove');
      flash({ type: 'success', text: 'Document removed' });
      await load();
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground mb-4">Employee Documents</h1>
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  const me = portal?.compliance;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Employee Documents</h1>
        <p className="text-sm text-muted-foreground">
          Insurance, driving records and signed agreements on file with SIG
        </p>
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
          {msg.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {portal?.canViewAll && overview ? (
        <Tabs defaultValue="team">
          <TabsList className="mb-6">
            <TabsTrigger value="team">Team compliance</TabsTrigger>
            <TabsTrigger value="mine">My documents</TabsTrigger>
            {canManageRequirements && <TabsTrigger value="reqs">Requirements</TabsTrigger>}
          </TabsList>

          <TabsContent value="team">
            <TeamOverview
              overview={overview}
              canVerify={portal.canVerify}
              onReview={review}
              onRemove={remove}
            />
          </TabsContent>

          <TabsContent value="mine">
            {me && <MyDocuments compliance={me} onUpload={setUploadFor} onRemove={remove} />}
          </TabsContent>

          {canManageRequirements && (
            <TabsContent value="reqs">
              <RequirementsAdmin />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        me && <MyDocuments compliance={me} onUpload={setUploadFor} onRemove={remove} />
      )}

      {uploadFor && (
        <UploadModal
          requirement={uploadFor}
          onUploaded={load}
          onClose={() => setUploadFor(null)}
        />
      )}
    </div>
  );
}

/* ─── Team compliance (admin) ──────────────────────────── */

function TeamOverview({
  overview,
  canVerify,
  onReview,
  onRemove,
}: {
  overview: ComplianceOverview;
  canVerify: boolean;
  onReview: (id: string, status: 'verified' | 'rejected') => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-r from-brand/20 to-card border-brand/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fully up to date
            </CardTitle>
            <ShieldCheck className="w-5 h-5 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {overview.compliantCount}
              <span className="text-lg text-muted-foreground font-normal">
                /{overview.totalEmployees}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.compliantPercent}% of employees at 100%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average completion
            </CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{overview.averagePercent}%</div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={cn('h-full rounded-full', percentColor(overview.averagePercent))}
                style={{ width: `${overview.averagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Awaiting verification
            </CardTitle>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-3xl font-bold text-foreground',
                overview.pendingReviewCount > 0 && 'text-blue-500',
              )}
            >
              {overview.pendingReviewCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">uploaded, not yet checked</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired or missing
            </CardTitle>
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-3xl font-bold text-foreground',
                overview.expiredCount + overview.missingCount > 0 && 'text-red-500',
              )}
            >
              {overview.expiredCount + overview.missingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.expiringCount} expiring within 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {overview.employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">No active employees found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {overview.employees.map((emp) => (
            <div key={emp.profileId} className="border-b border-border last:border-0">
              <button
                onClick={() => setExpanded(expanded === emp.profileId ? null : emp.profileId)}
                className="w-full flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors text-left"
              >
                <ChevronRight
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform flex-shrink-0',
                    expanded === emp.profileId && 'rotate-90',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ROLE_LABELS[emp.role] ?? emp.role}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  {emp.pendingCount > 0 && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-500">
                      {emp.pendingCount} to verify
                    </span>
                  )}
                  {emp.expiredCount > 0 && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-500">
                      {emp.expiredCount} expired
                    </span>
                  )}
                  {emp.expiringCount > 0 && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-500">
                      {emp.expiringCount} expiring
                    </span>
                  )}
                </div>

                <div className="w-32 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {emp.satisfiedCount}/{emp.requiredCount}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        emp.isComplete ? 'text-green-500' : 'text-foreground',
                      )}
                    >
                      {emp.percent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', percentColor(emp.percent))}
                      style={{ width: `${emp.percent}%` }}
                    />
                  </div>
                </div>
              </button>

              {expanded === emp.profileId && (
                <div className="px-4 pb-4 pl-12 space-y-2">
                  {emp.items.map((item) => (
                    <RequirementLine
                      key={item.requirement.id}
                      item={item}
                      canVerify={canVerify}
                      onReview={onReview}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── My documents (employee) ──────────────────────────── */

function MyDocuments({
  compliance,
  onUpload,
  onRemove,
}: {
  compliance: EmployeeCompliance;
  onUpload: (r: RequirementRow) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <Card
        className={cn(
          'mb-6',
          compliance.isComplete
            ? 'bg-gradient-to-r from-brand/20 to-card border-brand/30'
            : 'bg-card border-border',
        )}
      >
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {compliance.isComplete
                ? "You're fully up to date"
                : `${compliance.requiredCount - compliance.satisfiedCount} item${
                    compliance.requiredCount - compliance.satisfiedCount === 1 ? '' : 's'
                  } need your attention`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {compliance.satisfiedCount} of {compliance.requiredCount} documents verified and
              current
            </p>
          </div>
          <div className="w-40">
            <div className="flex items-center justify-end mb-1">
              <span
                className={cn(
                  'text-2xl font-bold',
                  compliance.isComplete ? 'text-brand' : 'text-foreground',
                )}
              >
                {compliance.percent}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={cn('h-full rounded-full', percentColor(compliance.percent))}
                style={{ width: `${compliance.percent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {compliance.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">No documents are required for your role.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {compliance.items.map((item) => (
            <MyRequirementCard
              key={item.requirement.id}
              item={item}
              onUpload={onUpload}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </>
  );
}

function MyRequirementCard({
  item,
  onUpload,
  onRemove,
}: {
  item: RequirementState;
  onUpload: (r: RequirementRow) => void;
  onRemove: (id: string) => void;
}) {
  const { requirement, document, state, daysToExpiry } = item;

  return (
    <div className="p-4 bg-card border border-border rounded-xl hover:border-brand/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{requirement.name}</p>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                STATE_COLORS[state],
              )}
            >
              {STATE_LABELS[state]}
            </span>
          </div>
          {requirement.description && (
            <p className="text-xs text-muted-foreground mt-1">{requirement.description}</p>
          )}
          {document && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {document.fileName}
              {document.expiresOn && (
                <>
                  {' · '}
                  {state === 'expired'
                    ? `expired ${formatDate(document.expiresOn)}`
                    : `expires ${formatDate(document.expiresOn)}`}
                  {daysToExpiry !== null && state === 'expiring' && ` (${daysToExpiry} days)`}
                </>
              )}
            </p>
          )}
          {state === 'rejected' && document?.reviewNote && (
            <p className="text-xs text-red-500 mt-1">Rejected: {document.reviewNote}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {document && (
            <a
              href={`/api/employee-documents/${document.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              title="Download"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          {document && (
            <button
              onClick={() => onRemove(document.id)}
              title="Remove"
              className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onUpload(requirement)}
            className="flex items-center gap-2 px-3 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition-colors text-sm whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            {document ? 'Replace' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared row used inside the admin expander ─────────── */

function RequirementLine({
  item,
  canVerify,
  onReview,
  onRemove,
}: {
  item: RequirementState;
  canVerify: boolean;
  onReview: (id: string, status: 'verified' | 'rejected') => void;
  onRemove: (id: string) => void;
}) {
  const { requirement, document, state } = item;

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-secondary/30">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-foreground">{requirement.name}</p>
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATE_COLORS[state])}>
            {STATE_LABELS[state]}
          </span>
        </div>
        {document?.expiresOn && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {state === 'expired' ? 'Expired' : 'Expires'} {formatDate(document.expiresOn)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {document && (
          <a
            href={`/api/employee-documents/${document.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            title="Download"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
        )}
        {canVerify && document && document.status !== 'verified' && (
          <button
            onClick={() => onReview(document.id, 'verified')}
            title="Mark verified"
            className="p-2 rounded-lg text-muted-foreground hover:text-green-500 hover:bg-secondary transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        {canVerify && document && document.status !== 'rejected' && (
          <button
            onClick={() => onReview(document.id, 'rejected')}
            title="Reject"
            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {canVerify && document && (
          <button
            onClick={() => onRemove(document.id)}
            title="Remove"
            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
