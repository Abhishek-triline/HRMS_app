'use client';

/**
 * A-10 detail — Admin Regularisation Detail
 * Same UI as M-07 but with an Admin badge and admin-level approve/reject access.
 */

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { RegularisationStatusBadge } from '@/components/attendance/RegularisationStatusBadge';
import { RegularisationApprovalActions } from '@/components/attendance/RegularisationApprovalActions';
import { useRegularisation } from '@/lib/hooks/useRegularisations';
import { REG_STATUS } from '@/lib/status/maps';
import { formatTime } from '@/lib/utils';

export default function AdminRegularisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: reg, isLoading, isError, error } = useRegularisation(Number(id));

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" aria-label="Loading regularisation detail…" />
      </div>
    );
  }

  if (isError) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div>
        <div role="alert" className="bg-crimsonbg border border-crimson/40 rounded-xl p-6 text-crimson text-sm">
          Failed to load: {errMsg}
        </div>
        <Link href="/admin/regularisation-queue" className="mt-4 inline-flex text-sm text-forest hover:underline">
          ← Back to queue
        </Link>
      </div>
    );
  }

  if (!reg) return null;

  const canDecide = reg.status === REG_STATUS.Pending;

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate mb-6">
        <Link href="/admin/regularisation-queue" className="hover:text-forest transition-colors">
          Reg Queue
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
        <span className="text-charcoal font-medium">{reg.code}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-heading text-xl font-semibold text-charcoal">{reg.code}</h1>
            <span className="bg-softmint text-forest text-xs font-bold px-2 py-0.5 rounded">Admin</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <RegularisationStatusBadge status={reg.status} routedToId={reg.routedToId} />
            <span className="text-xs text-slate">
              Submitted {new Date(reg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
        {canDecide && (
          <RegularisationApprovalActions
            regularisationId={reg.id}
            version={reg.version}
            onDecision={() => router.push('/admin/regularisation-queue')}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h2 className="font-heading text-sm font-semibold text-charcoal mb-4">Employee</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold flex-shrink-0" aria-hidden="true">
              {reg.employeeName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-charcoal">{reg.employeeName}</div>
              <div className="text-xs text-slate">{reg.employeeCode}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate mb-0.5">For Date</div>
              <div className="font-semibold text-charcoal">{reg.date}</div>
            </div>
            <div>
              <div className="text-xs text-slate mb-0.5">Age at Submit</div>
              <div className="font-semibold text-umber">{reg.ageDaysAtSubmit} days</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h2 className="font-heading text-sm font-semibold text-charcoal mb-4">Reason</h2>
          <p className="text-sm text-slate leading-relaxed">{reg.reason}</p>
          {reg.decisionNote && (
            <div className="mt-4 border-t border-sage/20 pt-4">
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Decision Note</div>
              <p className="text-sm text-charcoal">{reg.decisionNote}</p>
              {reg.decidedAt && (
                <div className="text-xs text-slate mt-1">
                  by {reg.decidedBy} on {new Date(reg.decidedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h2 className="font-heading text-sm font-semibold text-charcoal mb-4">Correction Comparison</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Original Record */}
            <div className="bg-offwhite rounded-lg p-4">
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">Original Record</div>
              {reg.originalRecord ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-slate mb-0.5">Status</div>
                    <AttendanceStatusBadge status={reg.originalRecord.status} />
                  </div>
                  <div>
                    <div className="text-xs text-slate mb-0.5">Check-In</div>
                    <div className="font-semibold text-charcoal">
                      {formatTime(reg.originalRecord.checkInTime)}
                      {reg.originalRecord.late && (
                        <span className="ml-1.5 text-xs font-semibold text-umber">(late)</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate mb-0.5">Check-Out</div>
                    <div className="font-semibold text-charcoal">{formatTime(reg.originalRecord.checkOutTime)}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate italic">No system record exists for this date.</p>
              )}
            </div>

            {/* Proposed Correction */}
            <div className="bg-offwhite rounded-lg p-4">
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">Proposed Correction</div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-slate mb-0.5">Proposed Check-In</div>
                  <div className="font-semibold text-charcoal">{formatTime(reg.proposedCheckIn)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate mb-0.5">Proposed Check-Out</div>
                  <div className="font-semibold text-charcoal">{formatTime(reg.proposedCheckOut)}</div>
                </div>
              </div>
            </div>

            {/* Decision info */}
            <div className="bg-offwhite rounded-lg p-4">
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">Decision Info</div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-slate mb-0.5">Status</div>
                  <RegularisationStatusBadge status={reg.status} />
                </div>
                {reg.correctedRecordId && (
                  <div>
                    <div className="text-xs text-slate mb-0.5">Corrected Record</div>
                    <div className="font-mono text-xs text-charcoal">{reg.correctedRecordId}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
