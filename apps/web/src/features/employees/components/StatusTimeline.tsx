'use client';

/**
 * StatusTimeline — vertical 2-item timeline for employee detail sidebar.
 * Shows "Active (since joinDate)" and "Onboarded (joinDate)" nodes.
 *
 * Contract gap: The backend does not currently expose status-change audit
 * events on the employee detail endpoint. Until the audit-log is queryable
 * from the client with employee-scoped filters, we render only the two
 * canonical states from the employee record itself.
 */

import type { EmployeeDetail } from '@nexora/contracts/employees';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function monthsSince(iso: string | null | undefined): string {
  if (!iso) return '';
  const from = new Date(iso);
  const now = new Date();
  const months =
    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (months < 1) return 'Less than a month';
  return `${months} month${months !== 1 ? 's' : ''}`;
}

interface Props {
  employee: Pick<EmployeeDetail, 'status' | 'joinDate'>;
}

export function StatusTimeline({ employee }: Props) {
  const joinLabel = formatDate(employee.joinDate);
  const duration = monthsSince(employee.joinDate);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-4 py-4">
      <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
        Status Timeline
      </h3>
      <div className="space-y-3">
        {/* Current status node */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3 h-3 text-richgreen"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-px flex-1 bg-sage/20 mt-1" />
          </div>
          <div className="pb-3">
            <div className="text-xs font-semibold text-charcoal">{employee.status}</div>
            <div className="text-xs text-slate">Since {joinLabel}</div>
            {duration && (
              <div className="text-xs text-sage mt-0.5">Current status &middot; {duration}</div>
            )}
          </div>
        </div>

        {/* Onboarded node */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-softmint flex items-center justify-center flex-shrink-0">
              <svg
                className="w-2.5 h-2.5 text-forest"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-charcoal">Onboarded</div>
            <div className="text-xs text-slate">{joinLabel}</div>
            <div className="text-xs text-sage mt-0.5">Date of joining</div>
          </div>
        </div>
      </div>
    </div>
  );
}
