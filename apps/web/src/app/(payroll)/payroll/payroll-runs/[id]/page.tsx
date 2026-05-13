'use client';

/**
 * P-04 — Payroll Run Detail (PayrollOfficer).
 *
 * Core PO task: review and adjust tax per payslip (BL-036a).
 * PO can also finalise the run (two-step modal, BL-034).
 * PO cannot reverse — Reverse button is Admin-only.
 *
 * Visual reference: prototype/payroll-officer/payroll-run-detail.html
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePayrollRun } from '@/lib/hooks/usePayroll';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { CursorPaginator } from '@/components/ui/CursorPaginator';
import { RunSummaryStatStrip, RunSummaryDetail } from '@/components/payroll/RunSummaryCard';
import { PayslipTable } from '@/components/payroll/PayslipTable';
import { RunChecklist } from '@/components/payroll/RunChecklist';
import { TwoStepFinaliseModal } from '@/components/payroll/TwoStepFinaliseModal';
import { EditableTaxEntry } from '@/components/payroll/EditableTaxEntry';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PayrollRunStatus } from '@nexora/contracts/payroll';
import type { PayslipSummary } from '@nexora/contracts/payroll';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function POPayrollRunDetailPage() {
  const params = useParams();
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const id = Number(idStr);

  const { data, isLoading, isError } = usePayrollRun(id);
  const [finaliseOpen, setFinaliseOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipSummary | null>(null);

  // Paginated payslip table — fetched independently of the run summary.
  const pager = useCursorPagination({ pageSize: 20, filtersKey: String(id) });
  const payslipsQuery = usePayslipsList({ runId: id, limit: pager.pageSize, cursor: pager.cursor });

  useEffect(() => {
    if (payslipsQuery.data) pager.cacheNextCursor(payslipsQuery.data.nextCursor);
  }, [payslipsQuery.data, pager]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner /><span className="ml-2 text-sm text-slate">Loading run…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center text-crimson text-sm">
        Failed to load payroll run.{' '}
        <Link href="/payroll/payroll-runs" className="underline text-forest">Go back</Link>
      </div>
    );
  }

  const { run } = data;
  const isReview = run.status === PayrollRunStatus.Review;
  const isFinalised = run.status === PayrollRunStatus.Finalised;
  const isDraft = run.status === PayrollRunStatus.Draft;

  const pagePayslips = payslipsQuery.data?.data ?? [];

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate mb-4">
        <Link href="/payroll/payroll-runs" className="hover:text-forest transition-colors">Payroll Runs</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{run.code}</span>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-charcoal">
          Payroll Run — {MONTH_NAMES[run.month]} {run.year}
        </h1>
        <p className="text-xs text-slate mt-0.5">
          {run.code} · Period {run.periodStart} to {run.periodEnd} · {run.workingDays} working days
        </p>
      </div>

      {/* 4-tile stat strip */}
      <RunSummaryStatStrip run={run} />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-charcoal">Employee Payslips</h3>
              <span className="text-xs text-slate">{run.employeeCount} payslip{run.employeeCount !== 1 ? 's' : ''}</span>
            </div>
            <PayslipTable
              mode="run-detail"
              payslips={pagePayslips}
              basePath="/payroll/payslips"
              canEditTax={isReview}
              onEditTax={setSelectedPayslip}
              startIndex={(pager.currentPage - 1) * pager.pageSize}
            />
            <CursorPaginator
              currentPage={pager.currentPage}
              pageSize={pager.pageSize}
              currentPageCount={pagePayslips.length}
              hasMore={pager.hasMore}
              highestReachablePage={pager.highestReachablePage}
              onPageChange={pager.goToPage}
              onPrev={pager.goPrev}
              onNext={pager.goNext}
            />
          </div>
        </div>

        <div className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Run Summary sidebar card */}
          <RunSummaryDetail run={run} proRatedCount={run.proRatedCount} />

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
            <h3 className="font-heading font-semibold text-sm text-charcoal mb-3">Review &amp; Finalise</h3>
            <p className="text-xs text-slate leading-relaxed mb-4">
              Once finalised, this run is <span className="font-semibold text-umber">permanently locked</span>. All payslips become immutable records.
            </p>
            {(isDraft || isReview) && (
              <Button variant="primary" className="w-full" onClick={() => setFinaliseOpen(true)}>
                Finalise Payroll
              </Button>
            )}
            {isFinalised && (
              <>
                <div className="bg-greenbg/60 border border-richgreen/30 rounded-xl px-4 py-3 mb-3">
                  <p className="text-xs text-richgreen font-semibold">Run finalised — all payslips locked (BL-031).</p>
                  {run.finalisedByName && (
                    <p className="text-xs text-richgreen/80 mt-0.5">By {run.finalisedByName}</p>
                  )}
                </div>
                <div className="bg-offwhite border border-sage/40 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate">
                    Reversals can only be initiated by Admin (BL-033).
                  </p>
                </div>
              </>
            )}
          </div>

          <RunChecklist payslipCount={run.employeeCount} lopCount={run.lopCount} workingDays={run.workingDays} />
        </div>
      </div>

      {/* Tax editor panel */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Edit tax">
          <div className="absolute inset-0 bg-charcoal/40" aria-hidden="true" onClick={() => setSelectedPayslip(null)} />
          <div className="relative bg-white w-full max-w-sm shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base font-bold text-charcoal">Edit Tax — {selectedPayslip.employeeName}</h3>
              <button type="button" aria-label="Close" onClick={() => setSelectedPayslip(null)} className="text-slate hover:text-forest">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EditableTaxEntry payslip={selectedPayslip} onSaved={() => setSelectedPayslip(null)} />
          </div>
        </div>
      )}

      <TwoStepFinaliseModal run={run} isOpen={finaliseOpen} onClose={() => setFinaliseOpen(false)} />
    </>
  );
}
