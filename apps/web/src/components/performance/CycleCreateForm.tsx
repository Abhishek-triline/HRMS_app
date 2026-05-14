'use client';

/**
 * CycleCreateForm — A-20.
 *
 * RHF form for cycle creation (Admin only).
 * Option B admin self-review: lists every Admin employee with a
 * HierarchyPicker for each one so the cycle creator can assign a peer reviewer.
 *
 * adminPeerReviewers submitted as { [adminId]: peerId } (string key, number value).
 * Admins not paired will surface in the missing-reviews report (managerId=null).
 *
 * Validation: fyStart < fyEnd, deadlines within window, all date fields required.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Label } from '@/components/ui/Label';
import { HierarchyPicker } from '@/components/employees/HierarchyPicker';
import { useEmployeesList } from '@/lib/hooks/useEmployees';
import { EMPLOYEE_STATUS, ROLE_ID } from '@/lib/status/maps';
import type { CreateCycleRequest } from '@nexora/contracts/performance';

const cycleCreateSchema = z
  .object({
    fyStart: z.string().min(1, 'Fiscal year start is required'),
    fyEnd: z.string().min(1, 'Fiscal year end is required'),
    selfReviewDeadline: z.string().min(1, 'Self-review deadline is required'),
    managerReviewDeadline: z.string().min(1, 'Manager-review deadline is required'),
  })
  .refine((data) => data.fyEnd > data.fyStart, {
    message: 'Fiscal year end must be after fiscal year start',
    path: ['fyEnd'],
  })
  .refine((data) => data.selfReviewDeadline >= data.fyStart, {
    message: 'Self-review deadline must be within the cycle window',
    path: ['selfReviewDeadline'],
  })
  .refine((data) => data.selfReviewDeadline <= data.fyEnd, {
    message: 'Self-review deadline must be within the cycle window',
    path: ['selfReviewDeadline'],
  })
  .refine((data) => data.managerReviewDeadline >= data.selfReviewDeadline, {
    message: 'Manager-review deadline must be on or after the self-review deadline',
    path: ['managerReviewDeadline'],
  })
  .refine((data) => data.managerReviewDeadline <= data.fyEnd, {
    message: 'Manager-review deadline must be within the cycle window',
    path: ['managerReviewDeadline'],
  });

type CycleCreateFormValues = z.infer<typeof cycleCreateSchema>;

interface CycleCreateFormProps {
  onSubmit: (data: CreateCycleRequest) => Promise<void>;
  isSubmitting?: boolean;
  /** Currently authenticated user's ID (INT) — excluded from peer picker */
  currentUserId?: number;
}

export function CycleCreateForm({ onSubmit, isSubmitting = false, currentUserId }: CycleCreateFormProps) {
  // peerAssignments: { adminId (number) -> peerId (number | null) }
  const [peerAssignments, setPeerAssignments] = useState<Record<number, number | null>>({});

  // Fetch all active Admin employees (roleId=4) for Option B pairing.
  const { data: adminData } = useEmployeesList({
    status: EMPLOYEE_STATUS.Active,
    roleId: ROLE_ID.Admin,
    limit: 100,
  });
  const adminEmployees = (adminData?.data ?? []).filter(
    (emp) => (emp.id as number) !== currentUserId,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CycleCreateFormValues>({
    resolver: zodResolver(cycleCreateSchema),
  });

  async function onValid(data: CycleCreateFormValues) {
    // Build adminPeerReviewers — only include pairs where a peer has been selected.
    // Key is string representation of admin ID (required by contract), value is number.
    const adminPeerReviewers: Record<string, number> = {};
    for (const [adminIdStr, peerId] of Object.entries(peerAssignments)) {
      if (peerId != null) {
        adminPeerReviewers[adminIdStr] = peerId;
      }
    }

    const payload: CreateCycleRequest = {
      fyStart: data.fyStart,
      fyEnd: data.fyEnd,
      selfReviewDeadline: data.selfReviewDeadline,
      managerReviewDeadline: data.managerReviewDeadline,
      adminPeerReviewers: Object.keys(adminPeerReviewers).length > 0
        ? adminPeerReviewers
        : undefined,
    };

    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6" noValidate>
      {/* Cycle window */}
      <section className="bg-white rounded-xl border border-sage/30 p-5">
        <h3 className="text-sm font-semibold text-charcoal mb-4">Cycle Period</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fyStart" required>Fiscal Year Start</Label>
            <input
              id="fyStart"
              type="date"
              {...register('fyStart')}
              className={clsx(
                'mt-0.5 w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white',
                'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
                errors.fyStart ? 'border-crimson' : 'border-sage',
              )}
              aria-invalid={errors.fyStart ? 'true' : undefined}
            />
            <FieldError message={errors.fyStart?.message} />
          </div>
          <div>
            <Label htmlFor="fyEnd" required>Fiscal Year End</Label>
            <input
              id="fyEnd"
              type="date"
              {...register('fyEnd')}
              className={clsx(
                'mt-0.5 w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white',
                'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
                errors.fyEnd ? 'border-crimson' : 'border-sage',
              )}
              aria-invalid={errors.fyEnd ? 'true' : undefined}
            />
            <FieldError message={errors.fyEnd?.message} />
          </div>
        </div>
      </section>

      {/* Deadlines */}
      <section className="bg-white rounded-xl border border-sage/30 p-5">
        <h3 className="text-sm font-semibold text-charcoal mb-4">Review Deadlines</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="selfReviewDeadline" required>Self-Review Deadline</Label>
            <input
              id="selfReviewDeadline"
              type="date"
              {...register('selfReviewDeadline')}
              className={clsx(
                'mt-0.5 w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white',
                'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
                errors.selfReviewDeadline ? 'border-crimson' : 'border-sage',
              )}
              aria-invalid={errors.selfReviewDeadline ? 'true' : undefined}
            />
            <FieldError message={errors.selfReviewDeadline?.message} />
          </div>
          <div>
            <Label htmlFor="managerReviewDeadline" required>Manager-Review Deadline</Label>
            <input
              id="managerReviewDeadline"
              type="date"
              {...register('managerReviewDeadline')}
              className={clsx(
                'mt-0.5 w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white',
                'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
                errors.managerReviewDeadline ? 'border-crimson' : 'border-sage',
              )}
              aria-invalid={errors.managerReviewDeadline ? 'true' : undefined}
            />
            <FieldError message={errors.managerReviewDeadline?.message} />
          </div>
        </div>
      </section>

      {/* Option B — Admin peer reviewers */}
      <section className="bg-white rounded-xl border border-sage/30 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-charcoal">Admin Peer Reviewers (Option B)</h3>
          <p className="text-xs text-slate mt-1">
            Each Admin employee needs a peer Admin as their reviewer. Admins without a peer assigned
            will appear in the Missing Reviews report with no manager. Admins not listed below are
            not yet Active in the system.
          </p>
        </div>

        {adminEmployees.length === 0 ? (
          <p className="text-sm text-slate py-2">No other Active Admin employees found.</p>
        ) : (
          <div className="space-y-4">
            {adminEmployees.map((admin) => (
              <div key={admin.id} className="flex items-start gap-4 p-3.5 bg-offwhite rounded-lg border border-sage/20">
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center text-forest text-xs font-bold">
                    {admin.name
                      .trim()
                      .split(/\s+/)
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-charcoal">{admin.name}</div>
                  <div className="text-xs text-slate">{admin.code}{admin.designation ? ` · ${admin.designation}` : ''}</div>
                  <div className="mt-2">
                    <HierarchyPicker
                      value={peerAssignments[admin.id as number] ?? null}
                      onChange={(peerId) =>
                        setPeerAssignments((prev) => ({ ...prev, [admin.id as number]: peerId }))
                      }
                      excludeId={admin.id as number}
                      label="Peer reviewer"
                      eligibleRoles="4"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Create performance cycle
        </Button>
      </div>
    </form>
  );
}
