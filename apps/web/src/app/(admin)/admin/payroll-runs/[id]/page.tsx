'use client';

/**
 * A-13 — Payroll Run Detail (Admin).
 * Visual reference: prototype/admin/payroll-run-detail.html
 *
 * Layout: RunSummaryCard (full-width) + two-column:
 *   Left: PayslipTable with Edit Tax button in Review status.
 *   Right: RunChecklist sidebar + Finalise / Reverse CTAs.
 *
 * Modals:
 *   TwoStepFinaliseModal — BL-034 concurrent guard.
 *   TwoStepReverseModal  — BL-032 / BL-033 Admin-only.
 *
 * EditableTaxEntry is rendered in a slide-in panel (state: selectedPayslip).
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePayrollRun } from '@/lib/hooks/usePayroll';
import { RunSummaryCard } from '@/components/payroll/RunSummaryCard';
import { PayslipTable } from '@/components/payroll/PayslipTable';
import { RunChecklist } from '@/components/payroll/RunChecklist';
import { TwoStepFinaliseModal } from '@/components/payroll/TwoStepFinaliseModal';
import { TwoStepReverseModal } from '@/components/payroll/TwoStepReverseModal';
import { EditableTaxEntry } from '@/components/payroll/EditableTaxEntry';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { PayslipSummary } from '@nexora/contracts/payroll';

export default function PayrollRunDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? '';

  const { data, isLoading, isError } = usePayrollRun(id);
  const [finaliseOpen, setFinaliseOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipSummary | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
        <span className="ml-2 text-sm text-slate">Loading run…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center text-crimson text-sm">
        Failed to load payroll run. <Link href="/admin/payroll-runs" className="underline text-forest">Go back</Link>
      </div>
    );
  }

  const { run, payslips } = data;
  const isReview = run.status === 'Review';
  const isFinalised = run.status === 'Finalised';
  const isDraft = run.status === 'Draft';

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate mb-4">
        <Link href="/admin/payroll-runs" className="hover:text-forest transition-colors">Payroll Runs</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{run.code}</span>
      </div>

      {/* Summary hero */}
      <RunSummaryCard run={run} />

      {/* Two-column body */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: payslip table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-charcoal">Employee Payslips</h3>
              <span className="text-xs text-slate">
                {payslips.length} payslip{payslips.length !== 1 ? 's' : ''}
              </span>
            </div>
            <PayslipTable
              mode="run-detail"
              payslips={payslips}
              basePath="/admin/payslips"
              canEditTax={isReview}
              onEditTax={setSelectedPayslip}
            />
          </div>
        </div>

        {/* Right: checklist + actions */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <RunChecklist payslips={payslips} workingDays={run.workingDays} />

          {/* Finalise CTA — available in Draft and Review */}
          {(isDraft || isReview) && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setFinaliseOpen(true)}
            >
              Finalise Run
            </Button>
          )}

          {/* Reverse CTA — Admin only, only when Finalised */}
          {isFinalised && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setReverseOpen(true)}
            >
              Reverse Run (Admin)
            </Button>
          )}

          {isFinalised && (
            <div className="bg-greenbg/60 border border-richgreen/30 rounded-xl px-4 py-3">
              <p className="text-xs text-richgreen font-semibold">
                Run finalised — all payslips locked (BL-031).
              </p>
              {run.finalisedByName && (
                <p className="text-xs text-richgreen/80 mt-0.5">
                  By {run.finalisedByName} · {run.finalisedAt ? new Date(run.finalisedAt).toLocaleDateString('en-IN') : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EditableTaxEntry slide-in panel */}
      {selectedPayslip && (
        <div
          className="fixed inset-0 z-40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Edit tax for payslip"
        >
          <div
            className="absolute inset-0 bg-charcoal/40"
            aria-hidden="true"
            onClick={() => setSelectedPayslip(null)}
          />
          <div className="relative bg-white w-full max-w-sm shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base font-bold text-charcoal">
                Edit Tax — {selectedPayslip.employeeName}
              </h3>
              <button
                type="button"
                aria-label="Close tax editor"
                onClick={() => setSelectedPayslip(null)}
                className="text-slate hover:text-forest transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EditableTaxEntry
              payslip={selectedPayslip}
              onSaved={() => setSelectedPayslip(null)}
            />
          </div>
        </div>
      )}

      {/* Finalise modal */}
      <TwoStepFinaliseModal
        run={run}
        isOpen={finaliseOpen}
        onClose={() => setFinaliseOpen(false)}
      />

      {/* Reverse modal (Admin only) */}
      <TwoStepReverseModal
        run={run}
        isOpen={reverseOpen}
        onClose={() => setReverseOpen(false)}
        onSuccess={() => {
          setReverseOpen(false);
        }}
      />
    </div>
  );
}
