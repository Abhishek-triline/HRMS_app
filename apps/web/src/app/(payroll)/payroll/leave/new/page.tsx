'use client';

import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { useLeaveTypes, useLeaveBalances } from '@/lib/hooks/useLeave';
import { useMe } from '@/lib/hooks/useAuth';

export default function PayrollApplyLeavePage() {
  const { data: me, isLoading: meLoading } = useMe();
  const employeeId = me?.data?.user?.id ?? '';
  const typesQuery = useLeaveTypes();
  const balancesQuery = useLeaveBalances(employeeId);

  if (meLoading || typesQuery.isLoading) {
    return <div className="flex items-center justify-center py-20 p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-charcoal">Apply for Leave</h1>
        <div className="text-xs text-slate flex items-center gap-1 mt-0.5">
          <Link href="/payroll/leave" className="hover:text-forest transition-colors">My Leave</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">Apply</span>
        </div>
      </div>
      <LeaveRequestForm
        leaveTypes={typesQuery.data ?? []}
        balancesData={balancesQuery.data ?? null}
        backPath="/payroll/leave"
        successPath="/payroll/leave"
      />
    </div>
  );
}
