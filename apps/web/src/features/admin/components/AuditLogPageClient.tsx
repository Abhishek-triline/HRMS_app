'use client';

/**
 * A-26 — Audit Log Viewer (Admin).
 * Visual reference: prototype/admin/audit-log.html
 *
 * Features:
 * - Filter bar: search (q), module, action, user role, date range (from/to)
 * - Stat tiles matching prototype
 * - Table: timestamp (IST), actor, module badge, action badge, target, expand row
 * - Infinite scroll ("Load more")
 * - Sticky policy banner
 * - Export CSV (client-side, loaded rows)
 * - before/after JSON diff with red/green legend
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuditLogs } from '@/features/admin/hooks/useAuditLogs';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { AuditLogEntry } from '@nexora/contracts/audit';
import type { AuditLogFilters } from '@/lib/api/audit';

// ── IST datetime formatter ───────────────────────────────────────────────────

const IST_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const UTC_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatIST(iso: string): string {
  try {
    return IST_FORMATTER.format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatUTC(iso: string): string {
  try {
    return UTC_FORMATTER.format(new Date(iso)) + ' UTC';
  } catch {
    return iso;
  }
}

// ── Module badge ─────────────────────────────────────────────────────────────

function ModuleBadge({ module }: { module: string }) {
  const label = moduleLabel(module);
  return (
    <span className="bg-softmint text-forest text-xs font-bold px-2 py-0.5 rounded">
      {label}
    </span>
  );
}

// ── Humanization layer ───────────────────────────────────────────────────────
//
// Translates audit fields into plain English so non-technical Admins can scan
// the log. The original technical fields (action code, target ID, JSON diff)
// remain available under "Show details" for forensic / engineering use.

const ACTION_PHRASES: Record<string, string> = {
  // Auth
  'auth.login':                       'signed in',
  'auth.logout':                      'signed out',
  'auth.login.failed':                'failed sign-in attempt',
  'auth.login.locked':                'account locked after too many failed attempts',
  'auth.password.reset':              'reset their password',
  'auth.password.first-login':        'completed first-time password setup',

  // Employees
  'employee.create':                  'created a new employee',
  'employee.update':                  'updated an employee’s profile',
  'employee.profile.self-update':     'updated their own profile',
  'employee.salary.update':           'updated an employee’s salary',
  'employee.status.changed':          'changed an employee’s status',
  'employee.manager.reassigned':      'reassigned an employee’s reporting manager',
  'employee.exit':                    'marked an employee as exited',

  // Leave
  'leave.create':                     'submitted a leave request',
  'leave.approve':                    'approved a leave request',
  'leave.reject':                     'rejected a leave request',
  'leave.cancel':                     'cancelled a leave request',
  'leave.escalated':                  'escalated a stale leave request to Admin',
  'leave.carry-forward':              'rolled over leave balances for the new year',

  // Attendance
  'attendance.checkin':               'checked in',
  'attendance.checkout':              'checked out',
  'attendance.late-deduction':        'auto-deducted a leave day for late check-ins',
  'attendance.midnight-generate':     'generated daily attendance rows',
  'regularisation.create':            'requested an attendance regularisation',
  'regularisation.approve':           'approved a regularisation request',
  'regularisation.reject':            'rejected a regularisation request',

  // Payroll
  'payroll.run.create':               'initiated a payroll run',
  'payroll.run.finalise':             'finalised a payroll run',
  'payroll.run.reverse':              'reversed a finalised payroll run',
  'payslip.tax.override':             'manually overrode tax on a payslip',
  'config.tax.update':                'updated the tax reference rate',

  // Performance
  'performance.cycle.create':         'started a new performance cycle',
  'performance.cycle.close':          'closed a performance cycle',
  'performance.review.self-rating':   'submitted a self-rating',
  'performance.review.manager-rating':'submitted a manager rating',
  'performance.goal.create':          'added a performance goal',
  'performance.goal.update':          'updated a performance goal',
  'performance.deadline-nudge-7d':    'sent a 7-day deadline reminder',
  'performance.deadline-nudge-1d':    'sent a 1-day deadline reminder',

  // Notifications / system
  'notifications.archive-90d':        'archived notifications older than 90 days',
  'idempotency-key.cleanup':          'cleaned up expired idempotency keys',

  // Configuration
  'config.attendance.update':         'updated attendance settings',
  'config.leave.update':              'updated leave settings',
  'config.holidays.replace':          'updated the holiday calendar',
};

const TARGET_LABEL: Record<string, string> = {
  Employee:           'employee',
  LeaveRequest:       'leave request',
  AttendanceRecord:   'attendance record',
  Regularisation:     'regularisation request',
  PayrollRun:         'payroll run',
  Payslip:            'payslip',
  PerformanceCycle:   'performance cycle',
  PerformanceReview:  'performance review',
  Goal:               'goal',
  Configuration:      'configuration',
  Holiday:            'holiday',
  Notification:       'notification',
};

function moduleLabel(module: string): string {
  switch (module.toLowerCase()) {
    case 'auth':           return 'Sign-in';
    case 'employees':      return 'People';
    case 'leave':          return 'Leave';
    case 'attendance':     return 'Attendance';
    case 'regularisation': return 'Attendance';
    case 'payroll':        return 'Payroll';
    case 'performance':    return 'Reviews';
    case 'notifications':  return 'Notifications';
    case 'configuration':  return 'Settings';
    case 'system':         return 'System';
    default:               return module.charAt(0).toUpperCase() + module.slice(1);
  }
}

/** Turn an action code into a plain-English sentence. Falls back to a sensible
 *  default when the action isn't in the lookup. */
function humanizeAction(entry: AuditLogEntry): string {
  const phrase = ACTION_PHRASES[entry.action];
  if (phrase) return phrase;
  // Heuristic fallback: split "module.verb" into "verbed the module"
  const parts = entry.action.split('.');
  if (parts.length >= 2) {
    const verb = parts[parts.length - 1]!.replace(/-/g, ' ');
    return `${verb} on ${moduleLabel(entry.module).toLowerCase()}`;
  }
  return entry.action;
}

function humanizeTarget(entry: AuditLogEntry): string {
  if (!entry.targetType) return '';
  const label = TARGET_LABEL[entry.targetType] ?? entry.targetType.toLowerCase();
  return label;
}

function humanizeActor(entry: AuditLogEntry): { name: string; sub: string } {
  if (!entry.actorId) return { name: 'System', sub: 'automatic' };
  // Try to pull a readable name out of the before/after blobs.
  const blob = (entry.after ?? entry.before) as Record<string, unknown> | null;
  const maybeName =
    blob && typeof blob === 'object'
      ? (blob['name'] as string | undefined) ??
        (blob['employeeName'] as string | undefined) ??
        (blob['actorName'] as string | undefined)
      : undefined;
  return {
    name: maybeName ?? entry.actorRole,
    sub: entry.actorRole,
  };
}

// ── Human-readable change summary ────────────────────────────────────────────

/** Field label map — converts technical field names to readable English. */
const FIELD_LABELS: Record<string, string> = {
  status:             'Status',
  reason:             'Reason',
  finalisedAt:        'Finalised at',
  finalisedBy:        'Finalised by',
  approvedAt:         'Approved at',
  approvedBy:         'Approved by',
  rejectedAt:         'Rejected at',
  rejectedBy:         'Rejected by',
  decidedAt:          'Decision time',
  decidedBy:          'Decided by',
  decisionNote:       'Decision note',
  escalatedAt:        'Escalated at',
  cancelledAt:        'Cancelled at',
  cancelledBy:        'Cancelled by',
  reversedAt:         'Reversed at',
  reversedBy:         'Reversed by',
  reversalReason:     'Reversal reason',
  reportingManagerId: 'Reporting manager',
  managerId:          'Manager',
  employeeId:         'Employee',
  name:               'Name',
  email:              'Email',
  phone:              'Phone',
  department:         'Department',
  designation:        'Designation',
  role:               'Role',
  employmentType:     'Employment type',
  joinDate:           'Join date',
  exitDate:           'Exit date',
  fromDate:           'From',
  toDate:             'To',
  type:               'Type',
  days:               'Days',
  basic_paise:        'Basic salary',
  allowances_paise:   'Allowances',
  hra_paise:          'HRA',
  transport_paise:    'Transport',
  other_paise:        'Other allowances',
  totalGrossPaise:    'Gross total',
  totalNetPaise:      'Net total',
  totalLopPaise:      'LOP total',
  totalTaxPaise:      'Tax total',
  workingDays:        'Working days',
  lopDays:            'LOP days',
  taxRate:            'Tax rate',
  taxPaise:           'Tax amount',
  selfRating:         'Self rating',
  managerRating:      'Manager rating',
  finalRating:        'Final rating',
  selfSubmittedAt:    'Self-rating submitted',
  managerSubmittedAt: 'Manager rating submitted',
  selfReviewDeadline: 'Self-review deadline',
  managerReviewDeadline: 'Manager-review deadline',
};

/** Fields that are internal-only and should be hidden from the friendly view. */
const HIDDEN_FIELDS = new Set([
  'id', 'version', 'createdAt', 'updatedAt',
  'cycleId', 'reviewId', 'leaveRequestId', 'employeeCode',
]);

/** Detect if a value looks like a ULID/CUID (long alphanumeric ID). */
function looksLikeId(v: unknown): v is string {
  return typeof v === 'string' && /^c[a-z0-9]{24,}$/i.test(v);
}

/** Format a value for the friendly view. */
function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // ISO date/datetime
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return value.includes('T')
          ? IST_FORMATTER.format(d) + ' IST'
          : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch { /* fall through */ }
  }
  // ULID — show truncated, full in tooltip via parent
  if (looksLikeId(value)) return `${value.slice(0, 8)}…`;
  // Paise → rupees for any *_paise field
  if (key.endsWith('_paise') || key.endsWith('Paise')) {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) {
      return '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n / 100));
    }
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

interface ChangeRow { key: string; label: string; before: string; after: string; changed: boolean }

function summarizeDiff(before: unknown, after: unknown): ChangeRow[] {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = new Set<string>([...Object.keys(b), ...Object.keys(a)]);
  const rows: ChangeRow[] = [];
  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    const label = FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    const beforeRaw = b[key];
    const afterRaw = a[key];
    const beforeText = formatValue(key, beforeRaw);
    const afterText = formatValue(key, afterRaw);
    const changed = JSON.stringify(beforeRaw ?? null) !== JSON.stringify(afterRaw ?? null);
    rows.push({ key, label, before: beforeText, after: afterText, changed });
  }
  // Sort: changed first, then alphabetical by label.
  rows.sort((x, y) => {
    if (x.changed !== y.changed) return x.changed ? -1 : 1;
    return x.label.localeCompare(y.label);
  });
  return rows;
}

// ── JSON diff display ────────────────────────────────────────────────────────

function JsonDiff({ before, after }: { before: unknown; after: unknown }) {
  if (before === null && after === null) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-3 text-xs text-slate mb-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-crimsonbg border border-crimson/30 inline-block" />
          Before
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-greenbg border border-richgreen/30 inline-block" />
          After
        </span>
      </div>
      {before !== null && (
        <div>
          <p className="text-[10px] font-semibold text-crimson uppercase tracking-wide mb-1">Before</p>
          <pre className="bg-crimsonbg/50 border border-crimson/20 rounded-lg px-3 py-2 text-[11px] text-crimson overflow-x-auto whitespace-pre-wrap break-words max-h-40">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
      )}
      {after !== null && (
        <div>
          <p className="text-[10px] font-semibold text-richgreen uppercase tracking-wide mb-1">After</p>
          <pre className="bg-greenbg/50 border border-richgreen/20 rounded-lg px-3 py-2 text-[11px] text-richgreen overflow-x-auto whitespace-pre-wrap break-words max-h-40">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Audit row ────────────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasTechnicalDetail =
    entry.before !== null || entry.after !== null || !!entry.targetId;
  const description = (entry as unknown as { description?: string }).description;

  const actor = humanizeActor(entry);
  const phrase = humanizeAction(entry);
  const targetLabel = humanizeTarget(entry);

  return (
    <>
      <tr className="hover:bg-offwhite/60 transition-colors">
        {/* When */}
        <td className="px-5 py-3 text-slate text-xs whitespace-nowrap">
          <span title={formatUTC(entry.createdAt)}>{formatIST(entry.createdAt)}</span>
        </td>

        {/* User — friendly name, role on the line below; actor ID in tooltip */}
        <td className="px-4 py-3">
          <div className="text-sm font-semibold text-charcoal">{actor.name}</div>
          <div className="text-xs text-slate" title={entry.actorId ?? 'system'}>
            {actor.sub}
          </div>
        </td>

        {/* Module */}
        <td className="px-4 py-3">
          <ModuleBadge module={entry.module} />
        </td>

        {/* Action — plain-English sentence (no badge) */}
        <td className="px-4 py-3 text-sm text-charcoal capitalize-first">
          {description ?? phrase}
        </td>

        {/* Target — friendly type label + truncated ID for context */}
        <td className="px-4 py-3 text-xs">
          {entry.targetType ? (
            <>
              <div className="text-charcoal font-medium">{targetLabel}</div>
              {entry.targetId && (
                <div className="font-mono text-slate truncate max-w-[160px]" title={entry.targetId}>
                  {entry.targetId.slice(0, 8)}…
                </div>
              )}
            </>
          ) : (
            <span className="text-slate">—</span>
          )}
        </td>

        {/* Details — Show / Hide toggle */}
        <td className="px-4 py-3">
          {hasTechnicalDetail ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="text-xs font-semibold text-forest hover:text-emerald transition-colors underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded"
            >
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          ) : (
            <span className="text-xs text-slate">—</span>
          )}
        </td>
      </tr>
      {expanded && hasTechnicalDetail && (
        <tr>
          <td colSpan={6} className="px-5 pb-4 pt-0 bg-offwhite/40">
            <ChangeSummary entry={entry} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Friendly change summary (replaces the raw JSON diff for non-tech admins) ──

function ChangeSummary({ entry }: { entry: AuditLogEntry }) {
  const [showRaw, setShowRaw] = useState(false);
  const hasDiff = entry.before !== null || entry.after !== null;
  const rows = hasDiff ? summarizeDiff(entry.before, entry.after) : [];
  const changedRows = rows.filter((r) => r.changed);
  const unchangedRows = rows.filter((r) => !r.changed);

  return (
    <div className="mt-3 mb-2 space-y-4">
      {/* What changed — readable rows */}
      {hasDiff && (
        <div>
          <div className="text-[11px] font-semibold text-slate uppercase tracking-wide mb-2">
            {changedRows.length > 0 ? 'What changed' : 'Record details'}
          </div>
          <div className="bg-white border border-sage/30 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-sage/15">
                {(changedRows.length > 0 ? changedRows : unchangedRows).map((r) => (
                  <tr key={r.key} className={r.changed ? 'bg-greenbg/20' : ''}>
                    <td className="px-3 py-2 text-slate font-medium w-40">{r.label}</td>
                    {r.changed ? (
                      <>
                        <td className="px-3 py-2 text-crimson line-through">{r.before}</td>
                        <td className="px-3 py-2 text-slate" aria-hidden="true">→</td>
                        <td className="px-3 py-2 text-richgreen font-medium">{r.after}</td>
                      </>
                    ) : (
                      <td className="px-3 py-2 text-charcoal" colSpan={3}>
                        {r.after}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {changedRows.length > 0 && unchangedRows.length > 0 && (
            <p className="text-[11px] text-slate mt-1.5">
              {unchangedRows.length} other field{unchangedRows.length === 1 ? '' : 's'} unchanged.
            </p>
          )}
        </div>
      )}

      {/* Reference IDs — collapsed footer */}
      <details className="text-xs">
        <summary className="cursor-pointer text-[11px] font-semibold text-slate uppercase tracking-wide hover:text-charcoal transition-colors select-none">
          Reference IDs &amp; raw data
        </summary>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] font-semibold text-slate uppercase tracking-wide mb-1">
              Event type
            </div>
            <code className="font-mono text-forest break-all text-[11px]">{entry.action}</code>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate uppercase tracking-wide mb-1">
              Affected record
            </div>
            {entry.targetType ? (
              <code className="font-mono text-forest break-all text-[11px]">
                {entry.targetType}
                {entry.targetId ? ` · ${entry.targetId}` : ''}
              </code>
            ) : (
              <span className="text-slate">—</span>
            )}
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate uppercase tracking-wide mb-1">
              Acted by
            </div>
            <code className="font-mono text-slate break-all text-[11px]">
              {entry.actorId ?? 'system'}
            </code>
          </div>
        </div>
        {hasDiff && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="text-[11px] font-semibold text-forest hover:text-emerald transition-colors underline-offset-2 hover:underline"
            >
              {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
            </button>
            {showRaw && <JsonDiff before={entry.before} after={entry.after} />}
          </div>
        )}
      </details>
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[120, 160, 80, 100, 120, 60].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className={`h-3 bg-sage/20 rounded`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── CSV export ───────────────────────────────────────────────────────────────

/** SEC-004-P7: Prefix formula-trigger characters so spreadsheet clients treat
 *  the cell as text rather than evaluating it as a formula. */
function csvSanitize(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

function exportToCsv(entries: AuditLogEntry[]) {
  const headers = ['Timestamp (IST)', 'Actor ID', 'Actor Role', 'Module', 'Action', 'Target Type', 'Target ID'];
  const rows = entries.map((e) => [
    formatIST(e.createdAt),
    e.actorId ?? 'system',
    e.actorRole,
    e.module,
    e.action,
    e.targetType ?? '',
    e.targetId ?? '',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${csvSanitize(String(c)).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Numbered paginator helper — emits up to 7 entries with ellipses ──────────

function buildPageNumbers(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | 'ellipsis'> = [1];
  if (current > 3) out.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 2) out.push('ellipsis');
  out.push(total);
  return out;
}

// ── Page ─────────────────────────────────────────────────────────────────────

const MODULES = ['', 'auth', 'leave', 'attendance', 'payroll', 'performance', 'employees', 'configuration', 'system'] as const;
const ROLES = ['', 'Admin', 'Manager', 'Employee', 'PayrollOfficer', 'system'] as const;

export function AuditLogPageClient() {
  const [q, setQ] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Applied filters (only change on "Apply")
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>({});

  // Numbered pagination — 20 rows per page.
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuditLogs(appliedFilters);

  const allEntries = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );
  const totalLoaded = allEntries.length;

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  // Lazily fetch the next backend page when the user navigates past loaded data.
  useEffect(() => {
    const needed = currentPage * PAGE_SIZE;
    if (needed > totalLoaded && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentPage, totalLoaded, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Slice the current page's rows.
  const pageEntries = useMemo(
    () => allEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [allEntries, currentPage],
  );

  // Total pages: known loaded + 1 if more available on the backend.
  const loadedPages = Math.max(1, Math.ceil(totalLoaded / PAGE_SIZE));
  const totalPages = hasNextPage ? loadedPages + 1 : loadedPages;

  function handleApply() {
    const filters: AuditLogFilters = {};
    if (q.trim()) filters.q = q.trim();
    if (module) filters.module = module;
    if (action.trim()) filters.action = action.trim();
    if (actorRole) filters.actorRole = actorRole;
    if (from) filters.from = from;
    if (to) filters.to = to;
    setAppliedFilters(filters);
  }

  function handleReset() {
    setQ('');
    setModule('');
    setAction('');
    setActorRole('');
    setFrom('');
    setTo('');
    setAppliedFilters({});
  }

  const handleExport = useCallback(() => {
    exportToCsv(allEntries);
  }, [allEntries]);

  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  return (
    <>
      {/* Policy banner */}
      <div className="bg-forest/10 border border-forest/20 rounded-xl px-6 py-4 mb-6 flex gap-4">
        <svg className="w-5 h-5 text-forest shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p className="text-forest font-semibold text-sm mb-1">Audit Policy</p>
          <p className="text-slate text-sm leading-relaxed">
            The audit log is <strong>system-generated and append-only</strong>. Every approval, rejection, cancellation,
            finalisation, reversal, status change, and configuration change is captured against a specific user and
            timestamp. No user — Admin included — can edit or delete an entry (BL-047 / BL-048). Coverage spans every
            module: user / hierarchy changes, leave decisions, attendance corrections, payroll runs and reversals, and
            review-cycle actions.
          </p>
        </div>
      </div>

      {/* Stat tiles — counts derived from the loaded entries (API doesn't yet
          expose pagination.total or todayCount/weekCount aggregates — v1.1). */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-4">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-wide mb-1.5">Today</div>
          <div className="font-heading text-2xl font-bold text-charcoal">
            {isLoading ? '—' : (() => {
              // Start of "today" in IST (Asia/Kolkata is +05:30).
              const now = new Date();
              const istNow = new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60_000);
              const istStartUtcMs = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate())
                - 5.5 * 60 * 60_000;
              const todayCount = allEntries.filter((e) => new Date(e.createdAt).getTime() >= istStartUtcMs).length;
              return todayCount;
            })()}
          </div>
          <p className="text-[11px] text-slate mt-0.5">
            events recorded{hasNextPage ? ' (loaded)' : ''}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-4">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-wide mb-1.5">Last 7 days</div>
          <div className="font-heading text-2xl font-bold text-charcoal">
            {isLoading ? '—' : (() => {
              const cutoff = Date.now() - 7 * 24 * 60 * 60_000;
              return allEntries.filter((e) => new Date(e.createdAt).getTime() >= cutoff).length;
            })()}
          </div>
          <p className="text-[11px] text-slate mt-0.5">across all modules</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-4">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-wide mb-1.5">Distinct users</div>
          <div className="font-heading text-2xl font-bold text-charcoal">
            {isLoading ? '—' : new Set(allEntries.map((e) => e.actorId).filter(Boolean)).size || '—'}
          </div>
          <p className="text-[11px] text-slate mt-0.5">last 7 days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-4">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-wide mb-1.5">Destructive actions</div>
          <div className="font-heading text-2xl font-bold text-crimson">
            {isLoading ? '—' : allEntries.filter((e) => /reversed|closed/i.test(e.action)).length || '—'}
          </div>
          <p className="text-[11px] text-slate mt-0.5">reversals + cycle closures</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-4">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-wide mb-1.5">Retention</div>
          <div className="font-heading text-base font-bold text-charcoal mt-1">Permanent</div>
          <p className="text-[11px] text-slate mt-0.5">never deleted</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 mb-5">
        <div className="flex items-end gap-3 flex-wrap">
          {/* Search / q */}
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="audit-q" className="block text-[11px] font-semibold text-slate uppercase tracking-wide mb-1">
              Search
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                id="audit-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Action, entity ID…"
                aria-label="Search audit log"
                className="w-full border border-sage/50 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
              />
            </div>
          </div>

          {/* Module */}
          <div>
            <label htmlFor="audit-module" className="block text-[11px] font-semibold text-slate uppercase tracking-wide mb-1">
              Module
            </label>
            <select
              id="audit-module"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              aria-label="Filter by module"
              className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest"
            >
              <option value="">All modules</option>
              {MODULES.slice(1).map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label htmlFor="audit-action" className="block text-[11px] font-semibold text-slate uppercase tracking-wide mb-1">
              Action
            </label>
            <select
              id="audit-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              aria-label="Filter by action"
              className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest"
            >
              <option value="">All actions</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Finalised">Finalised</option>
              <option value="Reversed">Reversed</option>
              <option value="Closed">Closed</option>
              <option value="Status change">Status change</option>
            </select>
          </div>

          {/* User */}
          <div>
            <label htmlFor="audit-role" className="block text-[11px] font-semibold text-slate uppercase tracking-wide mb-1">
              User
            </label>
            <select
              id="audit-role"
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              aria-label="Filter by actor role"
              className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest"
            >
              <option value="">All users</option>
              {ROLES.slice(1).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* From */}
          <div>
            <label htmlFor="audit-from" className="block text-[11px] font-semibold text-slate uppercase tracking-wide mb-1">
              From
            </label>
            <input
              id="audit-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>

          {/* To */}
          <div>
            <label htmlFor="audit-to" className="block text-[11px] font-semibold text-slate uppercase tracking-wide mb-1">
              To
            </label>
            <input
              id="audit-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>

          {/* Apply */}
          <Button variant="primary" size="sm" onClick={handleApply}>
            Apply
            {activeFilterCount > 0 && (
              <span className="ml-1.5 bg-mint text-forest text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </Button>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Clear
            </Button>
          )}

          {/* Export CSV */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={allEntries.length === 0}
            leadingIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h11l5 5v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            }
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-5 py-3 border-b border-sage/20 flex items-center justify-between">
          <div className="text-sm">
            {isLoading ? (
              <span className="text-slate text-sm">Loading…</span>
            ) : (
              <>
                <span className="font-semibold text-charcoal">Showing {totalLoaded}</span>
                <span className="text-slate"> entries{hasNextPage ? ' · more available' : ''}</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate flex items-center gap-1.5" aria-live="polite" aria-atomic>
            <span className="w-1.5 h-1.5 bg-richgreen rounded-full" aria-hidden="true" />
            Live · refreshes every 60s
          </span>
        </div>

        {/* Desktop table — hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm" aria-label="Audit log entries">
            <thead>
              <tr className="bg-offwhite border-b border-sage/30">
                <th scope="col" className="text-left px-5 py-3 font-semibold text-slate text-xs uppercase tracking-wider">When</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">User</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Module</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Action</th>
                <th
                  scope="col"
                  className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider"
                  title="The specific record this action affected — e.g. the leave request that was approved, the employee whose status changed, etc."
                >
                  Target
                </th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/20">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className="text-sm text-crimson mb-3">Failed to load audit log.</p>
                    <Button variant="secondary" size="sm" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </td>
                </tr>
              ) : allEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <svg className="w-10 h-10 text-sage/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <p className="text-sm text-slate font-medium">No audit entries found</p>
                    {activeFilterCount > 0 && (
                      <p className="text-xs text-slate mt-1">Try clearing the active filters.</p>
                    )}
                  </td>
                </tr>
              ) : (
                pageEntries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list — visible below md breakpoint */}
        <div className="md:hidden divide-y divide-sage/10">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-4 space-y-2 animate-pulse">
                <div className="h-3 bg-sage/20 rounded w-40" />
                <div className="h-3 bg-sage/20 rounded w-56" />
                <div className="h-3 bg-sage/20 rounded w-32" />
              </div>
            ))
          ) : isError ? (
            <div className="text-center py-10">
              <p className="text-sm text-crimson mb-3">Failed to load audit log.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : allEntries.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-slate font-medium">No audit entries found</p>
              {activeFilterCount > 0 && (
                <p className="text-xs text-slate mt-1">Try clearing the active filters.</p>
              )}
            </div>
          ) : (
            pageEntries.map((entry) => {
              const actor = humanizeActor(entry);
              const sentence = humanizeAction(entry);
              return (
                <div key={entry.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] text-slate">{formatIST(entry.createdAt)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate">
                      {moduleLabel(entry.module)}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-charcoal">{actor.name}</div>
                  <div className="text-sm text-charcoal capitalize-first">{sentence}</div>
                  <div className="text-[11px] text-slate">{actor.sub}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer — numbered paginator + append-only notice */}
        <div className="px-5 py-3 bg-offwhite/60 border-t border-sage/20 flex items-center justify-between flex-wrap gap-3">
          <div className="text-[11px] text-slate flex items-start gap-2">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Append-only · entries cannot be edited or deleted by any user, including Admin (BL-047).</span>
          </div>

          {totalLoaded > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, totalLoaded)} of {totalLoaded}
                {hasNextPage ? '+' : ''}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="border border-sage/50 px-3 py-1.5 rounded text-xs text-slate hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-2 py-1.5 text-xs text-slate">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={
                        p === currentPage
                          ? 'bg-forest text-white px-3 py-1.5 rounded text-xs font-semibold'
                          : 'border border-sage/50 px-3 py-1.5 rounded text-xs text-slate hover:bg-white'
                      }
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={currentPage >= totalPages || (isFetchingNextPage && currentPage === totalPages - 1)}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="border border-sage/50 px-3 py-1.5 rounded text-xs text-slate hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
