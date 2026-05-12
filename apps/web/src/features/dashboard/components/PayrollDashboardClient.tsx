'use client';

/**
 * PayrollDashboardClient — full payroll officer dashboard per prototype/payroll-officer/dashboard.html.
 *
 * Sections:
 *  1. TimeOfDayHero (with "Initiate Run" CTA)
 *  2. KPI strip: Current Run status · Employees · Estimated Gross · Pending Finalisations
 *  3. Two-panel: Payroll Run History table + Pre-Run Checklist
 */

import Link from 'next/link';
import { useMe } from '@/lib/hooks/useAuth';
import { usePayrollDashboard } from '@/features/dashboard/hooks/usePayrollDashboard';
import { TimeOfDayHero } from './TimeOfDayHero';
import { KpiTile } from './KpiTile';
import { PAYROLL_STATUS } from '@/lib/status/maps';

// v2: IDs are number, status is INT
type PayrollRun = {
  id: number;
  code: string;
  month: number;
  year: number;
  status: number;
  employeeCount: number;
  totalGrossPaise: number;
  totalNetPaise: number;
};

type ReversalRun = {
  reversalRunId: number;
  reversalRunCode: string;
  originalRunCode: string;
  reversedAt: string;
  reversedByName: string;
  reason: string;
  affectedEmployees: number;
};

function formatMoney(paise?: number | null): string {
  if (paise == null) return '—';
  const crore = paise / 100 / 1_00_00_000;
  if (crore >= 0.01) return `₹${crore.toFixed(2)} Cr`;
  const lakh = paise / 100 / 1_00_000;
  if (lakh >= 1) return `₹${lakh.toFixed(1)} L`;
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function statusPill(status?: number) {
  if (status === PAYROLL_STATUS.Finalised) {
    return (
      <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded">
        Finalised
      </span>
    );
  }
  if (status === PAYROLL_STATUS.Review) {
    return (
      <span className="bg-softmint text-forest text-xs font-bold px-2 py-1 rounded">
        Review
      </span>
    );
  }
  if (status === PAYROLL_STATUS.Reversed) {
    return (
      <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">
        Reversed
      </span>
    );
  }
  return (
    <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded">
      Draft
    </span>
  );
}

function monthName(n: number, y: number): string {
  return new Date(y, n - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

interface PayrollDashboardClientProps {
  firstName?: string;
}

export function PayrollDashboardClient({ firstName: firstNameProp }: PayrollDashboardClientProps = {}) {
  const me = useMe();
  const firstName =
    firstNameProp ?? me.data?.data?.user?.name?.split(' ')[0] ?? '';
  const dash = usePayrollDashboard();

  const subtitle = (() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('weekday')} · ${get('day')} ${get('month')} ${get('year')} · processing period active`;
  })();

  const now = new Date();
  const currentMonthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const currentRun = dash.currentRun as unknown as PayrollRun | null;

  return (
    <div>
      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <div
        data-nx-hero
        data-tod="day"
        className="relative rounded-2xl overflow-hidden mb-6 shadow-lg shadow-forest/10"
        aria-label="Payroll dashboard hero"
      >
        {/* Dot grid */}
        <svg
          className="nx-dotgrid absolute inset-0 w-full h-full opacity-[0.10] pointer-events-none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="payDotsProd" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="#FFFFFF" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#payDotsProd)" />
        </svg>
        <div className="nx-b1 absolute -top-16 -left-12 w-[18rem] h-[18rem] rounded-full bg-emerald/40 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="nx-b2 absolute -bottom-20 -right-16 w-[20rem] h-[20rem] rounded-full bg-mint/25 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="nx-sun absolute -top-6 -right-6 pointer-events-none" aria-hidden="true">
          <svg width="160" height="160" viewBox="0 0 220 220" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="nx-celestial">
            <circle cx="110" cy="110" r="40" fill="currentColor" fillOpacity="0.30" />
            <circle cx="110" cy="110" r="55" strokeOpacity="0.4" />
            <circle cx="110" cy="110" r="74" strokeOpacity="0.18" />
            <g strokeOpacity="0.35">
              <line x1="110" y1="20" x2="110" y2="40" /><line x1="110" y1="180" x2="110" y2="200" />
              <line x1="20" y1="110" x2="40" y2="110" /><line x1="180" y1="110" x2="200" y2="110" />
              <line x1="46" y1="46" x2="60" y2="60" /><line x1="160" y1="160" x2="174" y2="174" />
              <line x1="160" y1="60" x2="174" y2="46" /><line x1="46" y1="174" x2="60" y2="160" />
            </g>
          </svg>
        </div>
        <div className="relative px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">
              {currentMonthLabel} Payroll
            </h2>
            <p className="text-sm text-mint/80 mt-0.5">{subtitle}</p>
          </div>
          <Link
            href="/payroll/payroll-runs/new"
            className="bg-mint text-forest hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Initiate run
          </Link>
        </div>
      </div>

      {/* ── 2. KPI strip ────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
        data-nx-no-filter
        aria-label="Key metrics"
      >
        {/* Current Run */}
        <div className="bg-white rounded-xl border border-umber/30 px-5 py-4 hover:border-umber/60 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-umber uppercase tracking-widest">
              Current Run
            </span>
            <span className="w-1.5 h-1.5 bg-umber rounded-full" aria-hidden="true" />
          </div>
          {dash.runsLoading ? (
            <>
              <div className="h-6 w-24 bg-sage/20 rounded animate-pulse" />
              <div className="h-4 w-28 bg-sage/10 rounded mt-2 animate-pulse" />
            </>
          ) : dash.runsError ? (
            <div className="text-xs text-crimson">
              Failed{' '}
              <button type="button" onClick={() => { void dash.runsRefetch(); }} className="underline text-emerald">Retry</button>
            </div>
          ) : currentRun ? (
            <>
              <div className="font-heading text-xl font-bold text-charcoal leading-none">
                {monthName(currentRun.month, currentRun.year)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {statusPill(currentRun.status)}
                <span className="text-xs text-slate">
                  {currentRun.status === PAYROLL_STATUS.Draft ? 'Awaiting finalise' :
                   currentRun.status === PAYROLL_STATUS.Review ? 'Under review' : ''}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="font-heading text-xl font-bold text-charcoal">{currentMonthLabel}</div>
              <div className="text-xs text-slate mt-2">No run initiated</div>
            </>
          )}
        </div>

        {/* Employees */}
        <KpiTile
          label="Employees"
          value={currentRun?.employeeCount ?? '—'}
          subtext="Enrolled in current run"
          isLoading={dash.runsLoading}
          isError={dash.runsError}
          onRetry={dash.runsRefetch}
        />

        {/* Estimated Gross */}
        <div className="bg-white rounded-xl border border-sage/30 px-5 py-4">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-widest mb-2">
            Estimated Gross
          </div>
          {dash.runsLoading ? (
            <>
              <div className="h-8 w-24 bg-sage/20 rounded animate-pulse" />
              <div className="h-3 w-28 bg-sage/10 rounded mt-2 animate-pulse" />
            </>
          ) : (
            <>
              <div className="font-heading text-3xl font-bold text-charcoal leading-none">
                {currentRun ? formatMoney(currentRun.totalGrossPaise) : '—'}
              </div>
              <div className="text-xs text-slate mt-2">Pre-tax · pre-LOP</div>
            </>
          )}
        </div>

        {/* Pending Finalisations */}
        <KpiTile
          label="Pending Finalisations"
          value={dash.pendingCount}
          subtext={`${dash.pendingCount} run${dash.pendingCount !== 1 ? 's' : ''} awaiting finalise`}
          isLoading={dash.runsLoading}
          isError={dash.runsError}
          onRetry={dash.runsRefetch}
          href="/payroll/payroll-runs"
          attention={dash.pendingCount > 0}
          attentionDot={dash.pendingCount > 0}
        />
      </div>

      {/* ── 3. Two-panel row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Payroll Run History */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-sage/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sage/20">
            <h3 className="text-sm font-semibold text-charcoal">Payroll Run History</h3>
            <Link href="/payroll/payroll-runs" className="text-xs text-emerald font-semibold hover:underline">
              View all →
            </Link>
          </div>
          {dash.runsLoading ? (
            <div className="px-5 py-4 space-y-3" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-20 bg-sage/20 rounded animate-pulse" />
                  <div className="h-4 w-8 bg-sage/20 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-sage/20 rounded animate-pulse" />
                  <div className="h-5 w-14 bg-sage/20 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : dash.recentRuns.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate">No payroll runs yet. Start by initiating the first run.</p>
            </div>
          ) : (
            <table className="w-full" aria-label="Payroll run history">
              <thead>
                <tr className="bg-offwhite">
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-2.5">Period</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Employees</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Gross</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Status</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {(dash.recentRuns as unknown as PayrollRun[]).map((run) => (
                  <tr key={run.id} className="hover:bg-offwhite/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-charcoal">
                      {monthName(run.month, run.year)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate">{run.employeeCount}</td>
                    <td className="px-4 py-3 text-sm text-slate">{formatMoney(run.totalGrossPaise)}</td>
                    <td className="px-4 py-3">{statusPill(run.status)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/payroll/payroll-runs/${run.id}`}
                        className="text-xs text-emerald font-semibold hover:underline"
                      >
                        {run.status === PAYROLL_STATUS.Draft || run.status === PAYROLL_STATUS.Review ? 'Continue →' : 'View →'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Pre-Run Checklist / Recent Reversals */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-sage/30 px-5 py-5">
          <h3 className="text-sm font-semibold text-charcoal mb-4">
            Recent Reversals · This Quarter
          </h3>
          {dash.reversalsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-sage/20 animate-pulse flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-sage/20 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-sage/10 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : dash.reversalsError ? (
            <div className="text-xs text-crimson py-2">
              Failed to load reversals.{' '}
              <button type="button" onClick={() => { void dash.reversalsRefetch(); }} className="underline text-emerald">
                Retry
              </button>
            </div>
          ) : dash.recentReversals.length === 0 ? (
            <div className="py-4">
              <p className="text-sm text-slate">No reversals this quarter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(dash.recentReversals as unknown as ReversalRun[]).map((rev) => (
                <div key={rev.reversalRunId} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-crimsonbg flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                    <svg className="w-3 h-3 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal font-medium">{rev.originalRunCode} reversed</p>
                    {rev.reason && (
                      <p className="text-xs text-slate mt-0.5 line-clamp-1">{rev.reason}</p>
                    )}
                    <p className="text-xs text-sage mt-0.5">{timeAgo(rev.reversedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick action */}
          <div className="mt-5 pt-4 border-t border-sage/20">
            <Link
              href="/payroll/reversal-history"
              className="w-full block text-center border border-forest text-forest hover:bg-forest hover:text-white px-4 py-2.5 rounded-lg font-body text-sm font-semibold transition-colors"
            >
              View All Reversals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
