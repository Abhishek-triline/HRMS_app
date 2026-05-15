'use client';

/**
 * AttendanceConfigPanel — attendance-only cards. Per owner request, leave-
 * related cards (Escalation, Event-Based Leaves) live exclusively in the
 * Leave Config tab.
 *
 * Cards (in order):
 *   1. Daily Attendance Generation (info, no inputs)
 *   2. Standard Daily Working Hours
 *   3. Late Check-in Threshold
 *   4. Working Week & Holiday Calendar
 */

import { useEffect, useMemo, useState } from 'react';

import type { AttendanceConfig, LeaveConfig, Weekday } from '@nexora/contracts/configuration';
import {
  useAttendanceConfig,
  useUpdateAttendanceConfig,
} from '@/features/admin/hooks/useAttendanceConfig';
import {
  useLeaveConfigSettings,
  useUpdateLeaveConfigSettings,
} from '@/features/admin/hooks/useLeaveConfigSettings';
import { useHolidays, useReplaceHolidays } from '@/lib/hooks/useHolidays';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';

// ── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS: readonly Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function arraysEqualSet<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

function formatHolidayRow(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function describeApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

// ── Reusable bits ────────────────────────────────────────────────────────────

function ActivePill() {
  return (
    <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded shrink-0">
      Active
    </span>
  );
}

function CardFooter({
  showReset,
  onReset,
  onSave,
  saving,
  dirty,
}: {
  showReset?: boolean;
  onReset?: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  return (
    <div className="mt-5 pt-4 border-t border-sage/20 flex justify-end gap-3">
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty || saving}
          className="border border-sage/50 px-4 py-2 rounded-lg text-sm font-semibold text-slate hover:bg-offwhite disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function AttendanceConfigPanel() {
  const attendanceQuery = useAttendanceConfig();
  const leaveQuery = useLeaveConfigSettings();
  const attendanceMutation = useUpdateAttendanceConfig();
  const leaveMutation = useUpdateLeaveConfigSettings();

  const currentYear = new Date().getFullYear();
  const holidaysQuery = useHolidays(currentYear);
  const replaceHolidays = useReplaceHolidays();

  // ── Card 2: Standard Daily Hours ──────────────────────────────────────────
  const [hoursDraft, setHoursDraft] = useState<string>('8');

  // ── Card 3: Late threshold ────────────────────────────────────────────────
  const [thresholdDraft, setThresholdDraft] = useState<string>('10:30');

  // ── Card 3b: Undo check-out window (minutes) ──────────────────────────────
  const [undoWindowDraft, setUndoWindowDraft] = useState<string>('5');

  // ── Card 4: Weekly off + holidays ─────────────────────────────────────────
  const [weeklyOffDraft, setWeeklyOffDraft] = useState<Weekday[]>(['Sat', 'Sun']);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState(`${currentYear}-01-01`);
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  // ── Card 5: Escalation ────────────────────────────────────────────────────
  const [escalationDraft, setEscalationDraft] = useState<string>('5');

  // ── Card 6: Event-based leaves ────────────────────────────────────────────
  const [maternityWeeksDraft, setMaternityWeeksDraft] = useState<string>('26');
  const [paternityDaysDraft, setPaternityDaysDraft] = useState<string>('10');

  // Hydrate drafts from server data
  useEffect(() => {
    if (attendanceQuery.data) {
      setHoursDraft(String(attendanceQuery.data.standardDailyHours));
      setThresholdDraft(attendanceQuery.data.lateThresholdTime);
      setWeeklyOffDraft([...attendanceQuery.data.weeklyOffDays]);
      setUndoWindowDraft(String(attendanceQuery.data.undoWindowMinutes));
    }
  }, [attendanceQuery.data]);

  useEffect(() => {
    if (leaveQuery.data) {
      setEscalationDraft(String(leaveQuery.data.escalationPeriodDays));
      // Backend stores maternityDays; UI shows weeks. 7 days = 1 week.
      const weeks = Math.round(leaveQuery.data.maternityDays / 7);
      setMaternityWeeksDraft(String(weeks));
      setPaternityDaysDraft(String(leaveQuery.data.paternityDays));
    }
  }, [leaveQuery.data]);

  // ── Derived dirty flags ───────────────────────────────────────────────────
  const hoursDirty =
    attendanceQuery.data !== undefined &&
    Number(hoursDraft) !== attendanceQuery.data.standardDailyHours;
  const thresholdDirty =
    attendanceQuery.data !== undefined &&
    thresholdDraft !== attendanceQuery.data.lateThresholdTime;
  const undoWindowDirty =
    attendanceQuery.data !== undefined &&
    Number(undoWindowDraft) !== attendanceQuery.data.undoWindowMinutes;
  const weeklyOffDirty =
    attendanceQuery.data !== undefined &&
    !arraysEqualSet(weeklyOffDraft, attendanceQuery.data.weeklyOffDays);
  const escalationDirty =
    leaveQuery.data !== undefined &&
    Number(escalationDraft) !== leaveQuery.data.escalationPeriodDays;
  const eventDirty =
    leaveQuery.data !== undefined &&
    (Number(maternityWeeksDraft) * 7 !== leaveQuery.data.maternityDays ||
      Number(paternityDaysDraft) !== leaveQuery.data.paternityDays);

  // ── Holiday list (sorted) ─────────────────────────────────────────────────
  const sortedHolidays = useMemo(() => {
    const list = holidaysQuery.data ?? [];
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [holidaysQuery.data]);

  // ── Save handlers ─────────────────────────────────────────────────────────

  async function saveAttendancePartial(body: Partial<AttendanceConfig>, label: string) {
    try {
      await attendanceMutation.mutateAsync(body);
      showToast({ type: 'success', title: `${label} saved`, message: 'Settings updated successfully.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Save failed', message: describeApiError(err, 'Please try again.') });
    }
  }

  async function saveLeavePartial(body: Partial<LeaveConfig>, label: string) {
    try {
      await leaveMutation.mutateAsync(body);
      showToast({ type: 'success', title: `${label} saved`, message: 'Settings updated successfully.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Save failed', message: describeApiError(err, 'Please try again.') });
    }
  }

  function handleSaveHours() {
    const n = Number(hoursDraft);
    if (!Number.isFinite(n) || n < 1 || n > 24) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Hours must be between 1 and 24.' });
      return;
    }
    void saveAttendancePartial({ standardDailyHours: Math.round(n) }, 'Standard daily hours');
  }

  function handleSaveThreshold() {
    if (!/^\d{2}:\d{2}$/.test(thresholdDraft)) {
      showToast({ type: 'error', title: 'Invalid time', message: 'Use HH:MM format.' });
      return;
    }
    void saveAttendancePartial({ lateThresholdTime: thresholdDraft }, 'Late threshold');
  }

  function handleSaveUndoWindow() {
    const n = Number(undoWindowDraft);
    if (!Number.isInteger(n) || n < 0 || n > 60) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Window must be 0–60 minutes.' });
      return;
    }
    void saveAttendancePartial({ undoWindowMinutes: n }, 'Undo window');
  }

  function handleSaveWeeklyOff() {
    void saveAttendancePartial({ weeklyOffDays: weeklyOffDraft }, 'Working week');
  }

  function handleSaveEscalation() {
    const n = Number(escalationDraft);
    if (!Number.isInteger(n) || n < 1 || n > 14) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Escalation must be 1–14 working days.' });
      return;
    }
    void saveLeavePartial({ escalationPeriodDays: n }, 'Escalation period');
  }

  function handleSaveEventBased() {
    const weeks = Number(maternityWeeksDraft);
    const pDays = Number(paternityDaysDraft);
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Maternity must be 1–52 weeks.' });
      return;
    }
    if (!Number.isInteger(pDays) || pDays < 1 || pDays > 60) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Paternity must be 1–60 working days.' });
      return;
    }
    void saveLeavePartial(
      { maternityDays: Math.round(weeks * 7), paternityDays: pDays },
      'Event-based leaves',
    );
  }

  function toggleWeeklyOff(day: Weekday) {
    setWeeklyOffDraft((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function resetHours() {
    if (attendanceQuery.data) setHoursDraft(String(attendanceQuery.data.standardDailyHours));
  }
  function resetThreshold() {
    if (attendanceQuery.data) setThresholdDraft(attendanceQuery.data.lateThresholdTime);
  }
  function resetUndoWindow() {
    if (attendanceQuery.data) setUndoWindowDraft(String(attendanceQuery.data.undoWindowMinutes));
  }

  function handleAddHoliday() {
    const name = newHolidayName.trim();
    if (!name) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Holiday name is required.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newHolidayDate)) {
      showToast({ type: 'error', title: 'Invalid date', message: 'Use YYYY-MM-DD.' });
      return;
    }
    if (!newHolidayDate.startsWith(String(currentYear))) {
      showToast({ type: 'error', title: 'Invalid date', message: `Date must be in ${currentYear}.` });
      return;
    }
    const next = [
      ...sortedHolidays.map((h) => ({ date: h.date, name: h.name })),
      { date: newHolidayDate, name },
    ];
    replaceHolidays.mutate(
      { year: currentYear, holidays: next },
      {
        onSuccess: () => {
          setNewHolidayName('');
          setNewHolidayDate(`${currentYear}-01-01`);
          setShowHolidayForm(false);
        },
      },
    );
  }

  // ── Loading / error ───────────────────────────────────────────────────────
  if (attendanceQuery.isLoading || leaveQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" aria-label="Loading attendance config" />
      </div>
    );
  }

  if (attendanceQuery.isError || leaveQuery.isError) {
    return (
      <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson" role="alert">
        Could not load configuration. Please refresh.
      </div>
    );
  }

  return (
    <div>
      {/* ── Card 1: Daily Attendance Generation (info) ──────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Daily Attendance Generation
        </h3>
        <p className="text-xs text-slate mb-4">
          How attendance rows are created and overridden each day
        </p>
        <div className="bg-offwhite rounded-lg p-4 text-sm text-charcoal space-y-2">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" />
            <span>
              At <strong>00:00</strong> each day, the system creates an attendance row for every{' '}
              <strong>active</strong> employee with default status <strong>absent</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" />
            <span>
              Override priority: <strong>on-leave</strong> (approved leave) &gt;{' '}
              <strong>weekly-off / holiday</strong> &gt; <strong>present</strong> (check-in) &gt;{' '}
              <strong>absent</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" />
            <span>Hours worked = checkout − check-in (auto-calculated; never self-reported).</span>
          </div>
        </div>
      </div>

      {/* ── Card 2: Standard Daily Working Hours ────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-base font-semibold text-charcoal">
              Standard Daily Working Hours
            </h3>
            <p className="text-xs text-slate mt-1">
              Target hours used for the &ldquo;Remaining&rdquo; display on the check-in panel and
              attendance progress bars
            </p>
          </div>
          <ActivePill />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <label htmlFor="att-hours" className="block text-xs font-semibold text-charcoal mb-1.5">
              Hours per day
            </label>
            <input
              id="att-hours"
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={hoursDraft}
              onChange={(e) => setHoursDraft(e.target.value)}
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
            <p className="text-xs text-slate mt-1.5">Default 8h</p>
          </div>
          <div className="lg:col-span-2 bg-greenbg/40 border border-richgreen/20 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold text-richgreen mb-1">Display only</div>
            <p className="text-xs text-charcoal">
              This is a display-only target. It does not deduct leave, trigger overtime, or affect
              payroll. Late marks and hours worked are independent.
            </p>
          </div>
        </div>
        <CardFooter
          showReset
          onReset={resetHours}
          onSave={handleSaveHours}
          saving={attendanceMutation.isPending}
          dirty={hoursDirty}
        />
      </div>

      {/* ── Card 3: Late Check-in Threshold ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-base font-semibold text-charcoal">
              Late Check-in Threshold
            </h3>
            <p className="text-xs text-slate mt-1">
              Time after which employee check-in is marked as late
            </p>
          </div>
          <ActivePill />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <label htmlFor="att-threshold" className="block text-xs font-semibold text-charcoal mb-1.5">
              Threshold Time
            </label>
            <input
              id="att-threshold"
              type="time"
              value={thresholdDraft}
              onChange={(e) => setThresholdDraft(e.target.value)}
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
            <p className="text-xs text-slate mt-1.5">Default 10:30 AM</p>
          </div>
          <div className="lg:col-span-2 bg-umberbg/40 border border-umber/30 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold text-umber mb-1">Penalty Rule</div>
            <p className="text-xs text-charcoal">
              3 late marks in a calendar month →{' '}
              <strong>1 full day deducted from annual leave</strong>. Each additional late mark
              beyond 3 = another full day deducted.
            </p>
            <p className="text-xs text-slate mt-1">This rule is fixed and not configurable.</p>
          </div>
        </div>
        <CardFooter
          showReset
          onReset={resetThreshold}
          onSave={handleSaveThreshold}
          saving={attendanceMutation.isPending}
          dirty={thresholdDirty}
        />
      </div>

      {/* ── Card 3b: Undo Check-out Window ───────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-base font-semibold text-charcoal">
              Undo Check-out Window
            </h3>
            <p className="text-xs text-slate mt-1">
              How long after a check-out an employee can revert it and return to the &ldquo;Working&rdquo; state
            </p>
          </div>
          <ActivePill />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <label htmlFor="att-undo-window" className="block text-xs font-semibold text-charcoal mb-1.5">
              Window (minutes)
            </label>
            <input
              id="att-undo-window"
              type="number"
              min={0}
              max={60}
              step={1}
              value={undoWindowDraft}
              onChange={(e) => setUndoWindowDraft(e.target.value)}
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
            <p className="text-xs text-slate mt-1.5">Default 5 · range 0–60</p>
          </div>
          <div className="lg:col-span-2 bg-umberbg/40 border border-umber/30 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold text-umber mb-1">Set 0 to disable undo entirely</div>
            <p className="text-xs text-charcoal">
              When set to <strong>0</strong>, the &ldquo;Undo&rdquo; control is hidden on the check-in panel and
              every check-out is final. Employees who need to correct a check-out must submit a
              regularisation request.
            </p>
            <p className="text-xs text-slate mt-1">
              The window starts from the check-out timestamp. Undo is also rejected once the day
              rolls over.
            </p>
          </div>
        </div>
        <CardFooter
          showReset
          onReset={resetUndoWindow}
          onSave={handleSaveUndoWindow}
          saving={attendanceMutation.isPending}
          dirty={undoWindowDirty}
        />
      </div>

      {/* ── Card 4: Working Week & Holiday Calendar ─────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Working Week &amp; Holiday Calendar
        </h3>
        <p className="text-xs text-slate mb-5">
          Used for attendance status derivation and payroll proration
        </p>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-charcoal mb-2">Weekly Off Days</label>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAYS.map((day) => {
              const checked = weeklyOffDraft.includes(day);
              return (
                <label
                  key={day}
                  className={
                    checked
                      ? 'flex items-center gap-2 border-2 border-forest bg-softmint px-3 py-1.5 rounded-lg cursor-pointer'
                      : 'flex items-center gap-2 border border-sage/50 px-3 py-1.5 rounded-lg cursor-pointer'
                  }
                >
                  <input
                    type="checkbox"
                    className="accent-forest"
                    checked={checked}
                    onChange={() => toggleWeeklyOff(day)}
                    aria-label={`${day} is a weekly off day`}
                  />
                  <span className={checked ? 'text-sm font-semibold text-forest' : 'text-sm'}>
                    {day}
                  </span>
                </label>
              );
            })}
          </div>
          {weeklyOffDirty && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveWeeklyOff}
                disabled={attendanceMutation.isPending}
                className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {attendanceMutation.isPending ? 'Saving…' : 'Save Working Week'}
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-charcoal">
              Public Holidays — {currentYear}
            </label>
            <button
              type="button"
              onClick={() => setShowHolidayForm((v) => !v)}
              className="text-xs text-emerald font-semibold hover:underline"
            >
              {showHolidayForm ? 'Cancel' : '+ Add Holiday'}
            </button>
          </div>

          {showHolidayForm && (
            <div className="bg-softmint/50 border border-mint rounded-lg p-3 mb-3 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label htmlFor="new-holiday-name" className="block text-xs font-semibold text-charcoal mb-1">
                  Holiday name
                </label>
                <input
                  id="new-holiday-name"
                  type="text"
                  value={newHolidayName}
                  maxLength={120}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                  placeholder="e.g. Republic Day"
                />
              </div>
              <div>
                <label htmlFor="new-holiday-date" className="block text-xs font-semibold text-charcoal mb-1">
                  Date
                </label>
                <input
                  id="new-holiday-date"
                  type="date"
                  value={newHolidayDate}
                  min={`${currentYear}-01-01`}
                  max={`${currentYear}-12-31`}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  disabled={replaceHolidays.isPending}
                  className="bg-forest text-white hover:bg-emerald px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {replaceHolidays.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHolidayForm(false)}
                  className="border border-sage/50 px-3 py-2 rounded-lg text-xs font-semibold text-slate hover:bg-offwhite"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-offwhite rounded-lg p-3 space-y-2">
            {holidaysQuery.isLoading ? (
              <div className="text-xs text-slate text-center py-2">Loading holidays…</div>
            ) : sortedHolidays.length === 0 ? (
              <div className="text-xs text-slate text-center py-2">
                No holidays configured for {currentYear}.
              </div>
            ) : (
              sortedHolidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-charcoal">{h.name}</span>
                  <span className="text-slate">{formatHolidayRow(h.date)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
