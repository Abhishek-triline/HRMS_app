'use client';

/**
 * AttendanceConfigPanel — inline version of /admin/config/attendance.
 * Renders the form without page-level chrome (no breadcrumb, no redirect on save).
 * Used inside ConfigTabs.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AttendanceConfigSchema } from '@nexora/contracts/configuration';
import type { AttendanceConfig } from '@nexora/contracts/configuration';
import { useAttendanceConfig, useUpdateAttendanceConfig } from '@/features/admin/hooks/useAttendanceConfig';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';

export default function AttendanceConfigPanel() {
  const { data, isLoading, isError } = useAttendanceConfig();
  const mutation = useUpdateAttendanceConfig();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AttendanceConfig>({
    resolver: zodResolver(AttendanceConfigSchema),
    defaultValues: { lateThresholdTime: '10:30', standardDailyHours: 8 },
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  async function onSubmit(values: AttendanceConfig) {
    try {
      await mutation.mutateAsync(values);
      showToast({ type: 'success', title: 'Attendance config saved', message: 'Settings updated successfully.' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" aria-label="Loading attendance config" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson" role="alert">
        Could not load attendance configuration. Please refresh.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        {/* Late Check-in Threshold */}
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-heading text-base font-semibold text-charcoal">Late Check-in Threshold</h2>
              <p className="text-xs text-slate mt-1">
                Time after which a check-in is marked as <strong>Late</strong>. Used to trigger the 3-late-marks penalty (BL-027).
              </p>
            </div>
            <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded shrink-0">Active</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label htmlFor="att-lateThresholdTime" className="block text-xs font-semibold text-charcoal mb-1.5">
                Threshold Time <span className="text-crimson" aria-hidden="true">*</span>
              </label>
              <input
                id="att-lateThresholdTime"
                type="time"
                {...register('lateThresholdTime')}
                aria-required="true"
                aria-describedby={errors.lateThresholdTime ? 'att-lateThresh-error' : 'att-lateThresh-hint'}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest ${
                  errors.lateThresholdTime ? 'border-crimson' : 'border-sage/50'
                }`}
              />
              {errors.lateThresholdTime ? (
                <p id="att-lateThresh-error" role="alert" className="text-xs text-crimson mt-1.5">
                  {errors.lateThresholdTime.message}
                </p>
              ) : (
                <p id="att-lateThresh-hint" className="text-xs text-slate mt-1.5">
                  Default 10:30 AM (24-hour format)
                </p>
              )}
            </div>

            <div className="bg-umberbg/40 border border-umber/30 rounded-lg px-4 py-3">
              <div className="text-xs font-semibold text-umber mb-1">Penalty Rule (fixed)</div>
              <p className="text-xs text-charcoal">
                3 late marks in a calendar month → <strong>1 full day deducted</strong> from Annual leave.
                Each additional late mark beyond 3 = another full day deducted.
              </p>
              <p className="text-xs text-slate mt-1">This penalty rule is not configurable (BL-027).</p>
            </div>
          </div>
        </div>

        {/* Standard Daily Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-heading text-base font-semibold text-charcoal">Standard Daily Working Hours</h2>
              <p className="text-xs text-slate mt-1">
                Target hours used for the check-in panel&apos;s &ldquo;Remaining&rdquo; display and attendance progress bars.
              </p>
            </div>
            <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded shrink-0">Active</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label htmlFor="att-standardDailyHours" className="block text-xs font-semibold text-charcoal mb-1.5">
                Hours per day <span className="text-crimson" aria-hidden="true">*</span>
              </label>
              <input
                id="att-standardDailyHours"
                type="number"
                min={1}
                max={24}
                step={0.5}
                {...register('standardDailyHours', { valueAsNumber: true })}
                aria-required="true"
                aria-describedby={errors.standardDailyHours ? 'att-hours-error' : 'att-hours-hint'}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest ${
                  errors.standardDailyHours ? 'border-crimson' : 'border-sage/50'
                }`}
              />
              {errors.standardDailyHours ? (
                <p id="att-hours-error" role="alert" className="text-xs text-crimson mt-1.5">
                  {errors.standardDailyHours.message}
                </p>
              ) : (
                <p id="att-hours-hint" className="text-xs text-slate mt-1.5">
                  Default 8h · range 1–24 · step 0.5
                </p>
              )}
            </div>

            <div className="bg-greenbg/40 border border-richgreen/20 rounded-lg px-4 py-3">
              <div className="text-xs font-semibold text-richgreen mb-1">Display only</div>
              <p className="text-xs text-charcoal">
                This is a display-only target. It does not deduct leave, trigger overtime, or affect payroll directly.
                Late marks (BL-027) and hours worked (BL-025) are computed independently.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!isDirty && data && (
            <span className="text-xs text-slate">No changes</span>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={mutation.isPending}
            disabled={mutation.isPending || !isDirty}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
