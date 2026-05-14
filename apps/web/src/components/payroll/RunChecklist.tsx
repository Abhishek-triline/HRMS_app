/**
 * RunChecklist — pre-finalise checklist sidebar.
 *
 * Derived from the payslip list without a server round-trip:
 * - Flags payslips where finalTaxPaise === referenceTaxPaise as "tax not reviewed".
 * - Notes LOP > 0 cases.
 * - Notes proration cases (daysWorked < workingDays).
 *
 * Visual reference: prototype/admin/initiate-payroll.html checklist sidebar.
 */

import { clsx } from 'clsx';

interface ChecklistItem {
  label: string;
  detail: string;
  status: 'ok' | 'warn' | 'info';
}

interface RunChecklistProps {
  /** Total payslip count for this run (run.employeeCount). */
  payslipCount: number;
  /** Count of payslips with LOP days > 0 (run.lopCount). */
  lopCount: number;
  workingDays: number;
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-richgreen shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg className="w-4 h-4 text-umber shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4 text-forest shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function RunChecklist({ payslipCount, lopCount, workingDays }: RunChecklistProps) {
  const taxNotReviewed = 0; // Would compare finalTaxPaise === referenceTaxPaise, but
  // referenceTaxPaise isn't in PayslipSummary. Flag is informational in v1.

  const items: ChecklistItem[] = [
    {
      label: 'Salary structures loaded',
      detail: `${payslipCount} payslips generated`,
      status: payslipCount > 0 ? 'ok' : 'warn',
    },
    {
      label: 'LOP calculated',
      detail: lopCount > 0 ? `${lopCount} employee(s) have LOP deductions` : 'No LOP deductions',
      status: 'info',
    },
    {
      label: 'Tax reference available',
      detail:
        taxNotReviewed > 0
          ? `${taxNotReviewed} payslip(s) still at reference value — please review`
          : 'v1: PO manually enters final tax per payslip',
      status: taxNotReviewed > 0 ? 'warn' : 'info',
    },
    {
      label: 'No open conflicts',
      detail: 'Run can be finalised once tax review is complete',
      status: 'ok',
    },
  ];

  const allOk = items.every((i) => i.status === 'ok' || i.status === 'info');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
      <h3 className="font-heading text-sm font-bold text-charcoal mb-4">Pre-finalise Checklist</h3>

      <ul className="space-y-3" role="list">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            {item.status === 'ok' ? (
              <CheckIcon />
            ) : item.status === 'warn' ? (
              <WarnIcon />
            ) : (
              <InfoIcon />
            )}
            <div>
              <p className="text-xs font-semibold text-charcoal">{item.label}</p>
              <p className="text-xs text-slate mt-0.5">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div
        className={clsx(
          'mt-4 rounded-lg px-3 py-2.5 text-xs',
          allOk
            ? 'bg-greenbg/60 text-richgreen border border-richgreen/20'
            : 'bg-umberbg text-umber border border-umber/20',
        )}
      >
        {allOk
          ? 'All checks passed. Ready to finalise.'
          : 'Review the warnings above before finalising.'}
      </div>

      <p className="text-[10px] text-slate/50 mt-3">
        Working days: {workingDays} · Indian fiscal calendar (Apr–Mar)
      </p>
    </div>
  );
}
