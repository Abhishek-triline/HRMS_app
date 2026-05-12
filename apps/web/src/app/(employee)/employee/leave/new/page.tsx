'use client';

/**
 * E-03 — Apply for Leave (Employee)
 * Visual reference: prototype/employee/apply-leave.html
 *
 * Two-column layout: LeaveRequestForm (left), balance preview + approval route (right).
 * Shows conflict errors via ConflictErrorBlock (DN-19).
 */

import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { useLeaveTypes, useLeaveBalances } from '@/lib/hooks/useLeave';
import { useMe } from '@/lib/hooks/useAuth';

export default function ApplyLeavePage() {
  const { data: me, isLoading: meLoading } = useMe();
  const employeeId = me?.data?.user?.id ?? 0;

  const typesQuery = useLeaveTypes();
  const balancesQuery = useLeaveBalances(employeeId);

  const isLoading = meLoading || typesQuery.isLoading;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-charcoal">Apply for Leave</h1>
        <div className="text-xs text-slate flex items-center gap-1 mt-0.5">
          <Link href="/employee/leave" className="hover:text-forest transition-colors">
            My Leave
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">Apply</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" aria-label="Loading leave types" />
        </div>
      ) : typesQuery.error ? (
        <div
          className="bg-crimsonbg border border-crimson/20 rounded-xl px-6 py-4 text-sm text-crimson"
          role="alert"
        >
          Could not load leave types. Please refresh.
        </div>
      ) : (
        <LeaveRequestForm
          leaveTypes={typesQuery.data ?? []}
          balancesData={balancesQuery.data ?? null}
          backPath="/employee/leave"
          successPath="/employee/leave"
        />
      )}
    </>
  );
}
