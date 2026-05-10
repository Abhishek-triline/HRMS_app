/**
 * MissingReviewsTable — A-23.
 *
 * Table of employees with no submitted manager rating in the current cycle.
 * Columns: Employee, Dept/Role, Manager, Self Submitted, Manager Submitted.
 */

import Link from 'next/link';
import { clsx } from 'clsx';
import type { MissingReviewItem } from '@nexora/contracts/performance';

interface MissingReviewsTableProps {
  items: MissingReviewItem[];
  /** Base path for review links, e.g. /admin/performance */
  reviewBasePath?: string;
  className?: string;
}

const CheckIcon = ({ ok }: { ok: boolean }) => (
  <span
    className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded-full',
      ok ? 'bg-greenbg text-richgreen' : 'bg-crimsonbg text-crimson',
    )}
    aria-label={ok ? 'Submitted' : 'Not submitted'}
  >
    {ok ? (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )}
  </span>
);

export function MissingReviewsTable({
  items,
  reviewBasePath = '/admin/performance',
  className,
}: MissingReviewsTableProps) {
  if (items.length === 0) {
    return (
      <div className={clsx('text-sm text-slate text-center py-10 border border-sage/30 rounded-xl', className)}>
        All reviews are complete for this cycle.
      </div>
    );
  }

  return (
    <div className={clsx('overflow-x-auto rounded-xl border border-sage/30', className)}>
      <table className="w-full text-sm" aria-label="Missing reviews">
        <thead className="bg-offwhite border-b border-sage/30">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-charcoal">Employee</th>
            <th className="text-left py-3 px-4 font-semibold text-charcoal">Dept / Designation</th>
            <th className="text-left py-3 px-4 font-semibold text-charcoal">Assigned Manager</th>
            <th className="text-center py-3 px-4 font-semibold text-charcoal">Self</th>
            <th className="text-center py-3 px-4 font-semibold text-charcoal">Manager</th>
            <th className="text-right py-3 px-4 font-semibold text-charcoal">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sage/20">
          {items.map((item) => (
            <tr key={item.reviewId} className="hover:bg-offwhite/60 transition-colors">
              <td className="py-3 px-4">
                <div className="font-medium text-charcoal">{item.employeeName}</div>
                <div className="text-xs text-slate">{item.employeeCode}</div>
              </td>
              <td className="py-3 px-4">
                <div className="text-charcoal">{item.department ?? '—'}</div>
                <div className="text-xs text-slate">{item.designation ?? '—'}</div>
              </td>
              <td className="py-3 px-4">
                {item.managerName ? (
                  <span className="text-charcoal">{item.managerName}</span>
                ) : (
                  <span className="text-crimson text-xs font-semibold">Unassigned</span>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                <CheckIcon ok={item.selfSubmitted} />
              </td>
              <td className="py-3 px-4 text-center">
                <CheckIcon ok={item.managerSubmitted} />
              </td>
              <td className="py-3 px-4 text-right">
                <Link
                  href={`${reviewBasePath}/${item.reviewId}`}
                  className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                >
                  View review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
