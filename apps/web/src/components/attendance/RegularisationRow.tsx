'use client';

/**
 * RegularisationRow — a single table row in the regularisation queue/history.
 * Used by E-07, M-06, A-10.
 */

import Link from 'next/link';
import { RegularisationStatusBadge } from './RegularisationStatusBadge';
import type { RegularisationSummary } from '@nexora/contracts/attendance';

interface RegularisationRowProps {
  reg: RegularisationSummary;
  /** Detail link prefix e.g. /manager/regularisation-queue */
  detailHref: string;
  showEmployee?: boolean;
}

export function RegularisationRow({ reg, detailHref, showEmployee = false }: RegularisationRowProps) {
  const submittedAt = new Date(reg.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <tr className="hover:bg-offwhite/60 transition-colors">
      {showEmployee && (
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-xs font-bold flex-shrink-0" aria-hidden="true">
              {reg.employeeName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-charcoal">{reg.employeeName}</div>
              <div className="text-xs text-slate">{reg.employeeCode}</div>
            </div>
          </div>
        </td>
      )}
      <td className="px-5 py-4 font-medium text-charcoal">{reg.code}</td>
      <td className="px-4 py-4 text-charcoal">{reg.date}</td>
      <td className="px-4 py-4 text-slate">{reg.ageDaysAtSubmit} days</td>
      <td className="px-4 py-4">
        <RegularisationStatusBadge status={reg.status} routedTo={reg.routedTo} />
      </td>
      <td className="px-4 py-4 text-slate">{reg.approverName ?? '—'}</td>
      <td className="px-4 py-4 text-slate text-xs">{submittedAt}</td>
      <td className="px-4 py-4">
        <Link
          href={`${detailHref}/${reg.id}`}
          className="text-xs font-semibold text-forest hover:text-emerald transition-colors"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
