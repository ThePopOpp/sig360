import type { ComplianceState } from '@/lib/employee-documents';

export const STATE_LABELS: Record<ComplianceState, string> = {
  missing: 'Not uploaded',
  pending: 'Awaiting verification',
  rejected: 'Rejected',
  expired: 'Expired',
  expiring: 'Expiring soon',
  verified: 'Verified',
};

export const STATE_COLORS: Record<ComplianceState, string> = {
  missing: 'bg-gray-500/20 text-gray-500',
  pending: 'bg-blue-500/20 text-blue-500',
  rejected: 'bg-red-500/20 text-red-500',
  expired: 'bg-red-500/20 text-red-500',
  expiring: 'bg-yellow-500/20 text-yellow-500',
  verified: 'bg-green-500/20 text-green-500',
};

/** Bar color for a completion percentage. */
export function percentColor(percent: number): string {
  if (percent === 100) return 'bg-green-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
