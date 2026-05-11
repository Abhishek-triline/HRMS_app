'use client';

/**
 * MyPayslipsView — prototype-faithful personal payslip page body.
 * Visual reference: prototype/admin/my-payslips.html
 *
 * Sections:
 *   1. Year-summary hero band (MyOverviewHero) — 4 columns:
 *      Latest Payslip label + Net (Apr) + FY Earnings + Tax YTD
 *   2. Year selector strip — "Payslip History" heading + FY dropdown
 *   3. 3-column grid of PayslipCards
 *      - Latest card: border-2 border-emerald + lock icon on badge
 *      - Others:     border border-sage/30
 *
 * FY: April–March cycle.
 *   FY YYYY-YY starts April of YYYY, ends March of YYYY+1.
 *   Today = May 2026 → current FY = 2026-27 (Apr 2026 – Mar 2027).
 *
 * Data: grossPaise / finalTaxPaise / netPayPaise (paise integers).
 * Flag: `gross_paise`, `tax_paise` are the CONTRACT field names; this file
 *   uses the camelCase aliases `grossPaise`, `finalTaxPaise`, `netPayPaise`
 *   as typed in @nexora/contracts/payroll PayslipSummary.
 */

import { useState, useMemo } from 'react';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { MyOverviewHero } from '@/features/overview/components/MyOverviewHero';
import { PayslipCard } from './PayslipCard';
import { Spinner } from '@/components/ui/Spinner';
import type { PayslipSummary } from '@nexora/contracts/payroll';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.floor(paise / 100));
}

/**
 * Returns the fiscal year start year for a given calendar year + month.
 * April (month 4) starts a new FY; Jan–Mar belong to the previous FY start.
 * e.g. May 2026 → FY start = 2026; Feb 2026 → FY start = 2025.
 */
function fyStartYear(year: number, month: number): number {
  return month >= 4 ? year : year - 1;
}

/** Format FY as "FY 2026-27". */
function fyLabel(startYear: number): string {
  return `FY ${startYear}-${String(startYear + 1).slice(2)}`;
}

/** Filter payslips belonging to a given FY start year. */
function filterByFY(payslips: PayslipSummary[], startYear: number): PayslipSummary[] {
  return payslips.filter((p) => {
    const ps = fyStartYear(p.year, p.month);
    return ps === startYear;
  });
}

/** Sort payslips newest first (by year desc, month desc). */
function sortNewestFirst(payslips: PayslipSummary[]): PayslipSummary[] {
  return [...payslips].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month,
  );
}

// ── YTD Hero Skeleton ─────────────────────────────────────────────────────────

function YTDHeroSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6 p-6 text-white animate-pulse"
      style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #2D7A5F 50%, #6FBE9E 100%)' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 bg-white/20 rounded w-24 mb-2" />
            <div className="h-7 bg-white/20 rounded w-32 mb-1" />
            <div className="h-2.5 bg-white/10 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MyPayslipsView ─────────────────────────────────────────────────────────────

interface MyPayslipsViewProps {
  /** e.g. "/admin/payslips" — card links to basePath/{id} */
  basePath: string;
}

export function MyPayslipsView({ basePath }: MyPayslipsViewProps) {
  const today = new Date();
  const currentFYStart = fyStartYear(today.getFullYear(), today.getMonth() + 1);

  const [selectedFYStart, setSelectedFYStart] = useState(currentFYStart);

  const { data, isLoading, isError } = usePayslipsList();
  const allPayslips: PayslipSummary[] = data?.data ?? [];

  // Available FY options — derive from payslips + always show current FY
  const fyOptions = useMemo(() => {
    const years = new Set<number>();
    years.add(currentFYStart);
    allPayslips.forEach((p) => years.add(fyStartYear(p.year, p.month)));
    return Array.from(years).sort((a, b) => b - a); // newest first
  }, [allPayslips, currentFYStart]);

  // FY-filtered payslips, sorted newest first
  const fyPayslips = useMemo(
    () => sortNewestFirst(filterByFY(allPayslips, selectedFYStart)),
    [allPayslips, selectedFYStart],
  );

  // Latest payslip (across all FYs, not just selected one)
  const allSorted = useMemo(() => sortNewestFirst(allPayslips), [allPayslips]);
  const latestPayslip = allSorted[0] ?? null;

  // Hero stats — derived from the SELECTED FY subset
  const fyGross = fyPayslips.reduce((s, p) => s + p.grossPaise, 0);
  const fyTax = fyPayslips.reduce((s, p) => s + p.finalTaxPaise, 0);
  const fyMonthCount = fyPayslips.length;

  // Net of the very latest payslip (could be from any FY)
  const latestNet = latestPayslip?.netPayPaise ?? 0;
  const latestMonthName = latestPayslip
    ? `${MONTH_NAMES[(latestPayslip.month ?? 1) - 1]} ${latestPayslip.year}`
    : '—';
  const latestFinalisedSubtitle = latestPayslip?.status === 'Finalised'
    ? `Finalised ${latestPayslip.month ? new Date(latestPayslip.year, latestPayslip.month - 1, 30).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`
    : latestPayslip?.status ?? '—';

  // The latest payslip card in the SELECTED FY (for emerald border)
  const latestInFY = fyPayslips[0] ?? null;

  return (
    <div>
      {/* ── Year-summary Hero Band ─────────────────────────────────────────── */}
      {isLoading ? (
        <YTDHeroSkeleton />
      ) : (
        <MyOverviewHero>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Latest Payslip */}
            <div>
              <div className="text-mint/80 text-xs uppercase font-semibold mb-1">Latest Payslip</div>
              <div className="font-heading text-xl font-bold">{latestMonthName}</div>
              <div className="text-mint/80 text-xs mt-1">{latestFinalisedSubtitle}</div>
            </div>

            {/* Net (latest) */}
            <div>
              <div className="text-mint/80 text-xs uppercase font-semibold mb-1">
                Net ({latestPayslip ? MONTH_NAMES[(latestPayslip.month ?? 1) - 1].slice(0, 3) : '—'})
              </div>
              <div className="font-heading text-2xl font-bold">{formatPaise(latestNet)}</div>
            </div>

            {/* FY Earnings */}
            <div>
              <div className="text-mint/80 text-xs uppercase font-semibold mb-1">
                {fyLabel(selectedFYStart)} Earnings
              </div>
              <div className="font-heading text-2xl font-bold">{formatPaise(fyGross)}</div>
              <div className="text-mint/80 text-xs mt-1">
                {fyMonthCount} month{fyMonthCount !== 1 ? 's' : ''} so far
              </div>
            </div>

            {/* Tax YTD */}
            <div>
              <div className="text-mint/80 text-xs uppercase font-semibold mb-1">Tax YTD</div>
              <div className="font-heading text-2xl font-bold">{formatPaise(fyTax)}</div>
            </div>
          </div>
        </MyOverviewHero>
      )}

      {/* ── Year Selector Strip ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-base text-charcoal">Payslip History</h2>
        <select
          aria-label="Select fiscal year"
          value={selectedFYStart}
          onChange={(e) => setSelectedFYStart(Number(e.target.value))}
          className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
        >
          {fyOptions.map((y) => (
            <option key={y} value={y}>{fyLabel(y)}</option>
          ))}
        </select>
      </div>

      {/* ── Payslip Card Grid ──────────────────────────────────────────────── */}
      {isError ? (
        <div
          role="alert"
          className="text-center py-12 text-crimson text-sm"
        >
          Failed to load payslips. Please refresh.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" aria-label="Loading payslips…" />
        </div>
      ) : fyPayslips.length === 0 ? (
        <div className="text-center py-12 text-slate text-sm">
          No payslips for {fyLabel(selectedFYStart)}.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {fyPayslips.map((ps) => (
            <PayslipCard
              key={ps.id}
              payslip={ps}
              isLatest={latestInFY?.id === ps.id}
              basePath={basePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
