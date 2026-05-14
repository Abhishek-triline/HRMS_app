'use client';

/**
 * EncashmentStatusBadge — status pill for leave encashment requests.
 *
 * v2: status is INT code (1=Pending, 2=ManagerApproved, 3=AdminFinalised,
 *     4=Paid, 5=Rejected, 6=Cancelled).
 */

import { LEAVE_ENCASHMENT_STATUS } from '@/lib/status/maps';

interface EncashmentStatusBadgeProps {
  status: number;
  className?: string;
}

export function EncashmentStatusBadge({ status, className = '' }: EncashmentStatusBadgeProps) {
  switch (status) {
    case LEAVE_ENCASHMENT_STATUS.Pending:
      return (
        <span
          className={`inline-flex items-center gap-1 bg-umberbg text-umber text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
        >
          Pending
        </span>
      );
    case LEAVE_ENCASHMENT_STATUS.ManagerApproved:
      return (
        <span
          className={`inline-flex items-center gap-1 bg-softmint text-forest text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
        >
          Manager Approved
        </span>
      );
    case LEAVE_ENCASHMENT_STATUS.AdminFinalised:
      return (
        <span
          className={`inline-flex items-center gap-1 bg-greenbg text-richgreen text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
        >
          Admin Finalised
        </span>
      );
    case LEAVE_ENCASHMENT_STATUS.Paid:
      return (
        <span
          className={`inline-flex items-center gap-1 bg-greenbg text-richgreen text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
        >
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Paid
        </span>
      );
    case LEAVE_ENCASHMENT_STATUS.Rejected:
      return (
        <span
          className={`inline-flex items-center gap-1 bg-crimsonbg text-crimson text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
        >
          Rejected
        </span>
      );
    case LEAVE_ENCASHMENT_STATUS.Cancelled:
      return (
        <span
          className={`inline-flex items-center gap-1 bg-sage/30 text-slate text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
        >
          Cancelled
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 bg-sage/30 text-slate text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
        >
          {status}
        </span>
      );
  }
}
