/**
 * LeaveBalanceGrid — 4-up grid of LeaveBalanceCards.
 * Takes a LeaveBalancesResponse data object and renders all balances.
 * Responsive: 4-col desktop → 2-col tablet → 1-col mobile.
 */

import { clsx } from 'clsx';
import { LeaveBalanceCard } from './LeaveBalanceCard';
import type { LeaveBalancesResponse } from '@nexora/contracts/leave';

interface LeaveBalanceGridProps {
  data: LeaveBalancesResponse['data'];
  className?: string;
}

export function LeaveBalanceGrid({ data, className }: LeaveBalanceGridProps) {
  if (data.balances.length === 0) {
    return (
      <div className="text-sm text-slate text-center py-8">
        No leave balances configured for this employee.
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5',
        className,
      )}
    >
      {data.balances.map((balance) => (
        <LeaveBalanceCard key={balance.leaveTypeId} balance={balance} />
      ))}
    </div>
  );
}
