'use client';

/**
 * AttendanceConfigPanel — 6 cards matching prototype/admin/config.html exactly.
 *
 * Card order (prototype lines 29-177):
 *   1. Daily Attendance Generation   (informational, no inputs)
 *   2. Standard Daily Working Hours  (hours input + green callout, per-card save)
 *   3. Late Check-in Threshold       (time input + umber callout, per-card save)
 *   4. Working Week & Holiday Calendar (day chips + holiday list)
 *   5. Leave Approval Escalation     (number input + crimson callout, per-card save)
 *   6. Event-Based Leaves            (maternity + paternity inputs, per-card save)
 *
 * Data wiring:
 *   - Cards 2 + 3 → useAttendanceConfig / useUpdateAttendanceConfig
 *   - Cards 5 + 6 → useLeaveConfigSettings / useUpdateLeaveConfigSettings
 *   - Card 4 holidays → useHolidays (static fallback: see report below)
 *   - Card 4 weekly-off → static placeholder (no backend contract for this field)
 */

import { useEffect, useState } from 'react';
import { useAttendanceConfig, useUpdateAttendanceConfig } from '@/features/admin/hooks/useAttendanceConfig';
import { useLeaveConfigSettings, useUpdateLeaveConfigSettings } from '@/features/admin/hooks/useLeaveConfigSettings';
import { useHolidays } from '@/lib/hooks/useHolidays';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { AttendanceConfig } from '@nexora/contracts/configuration';
import type { LeaveConfig } from '@nexora/contracts/configuration';

// ── Shared card footer ────────────────────────────────────────────────────────

function CardFooter({
  onReset,
  onSave,
  isSaving,
  showReset = true,
}: {
  onReset?: () => void;
  onSave: () => void;
  isSaving: boolean;
  showReset?: boolean;
}) {
  return (
    <div className="mt-5 pt-4 border-t border-sage/20 flex justify-end gap-3">
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="border border-sage/50 px-4 py-2 rounded-lg text-sm font-semibold text-slate hover:bg-offwhite"
        >
          Reset
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

// ── Active pill ───────────────────────────────────────────────────────────────

function ActivePill() {
  return (
    <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded">Active</span>
  );
}

// ── Card 1: Daily Attendance Generation (informational) ───────────────────────

function DailyAttendanceGenerationCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
      <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
        Daily Attendance Generation
      </h3>
      <p className="text-xs text-slate mb-4">
        How attendance rows are created and overridden each day
      </p>
      <div className="bg-offwhite rounded-lg p-4 text-sm text-charcoal space-y-2">
        <div className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />
          <span>
            At <strong>00:00</strong> each day, the system creates an attendance row for every{' '}
            <strong>active</strong> employee with default status <strong>absent</strong>.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />
          <span>
            Override priority: <strong>on-leave</strong> (approved leave) &gt;{' '}
            <strong>weekly-off / holiday</strong> &gt; <strong>present</strong> (check-in) &gt;{' '}
            <strong>absent</strong>.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />
          <span>Hours worked = checkout − check-in (auto-calculated; never self-reported).</span>
        </div>
      </div>
    </div>
  );
}

// ── Card 2: Standard Daily Working Hours ──────────────────────────────────────

function StandardDailyHoursCard({
  value,
  onChange,
  onSave,
  onReset,
  isSaving,
}: {
  value: number;
  onChange: (v: number) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
}) {
  return (
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
          <label htmlFor="att-standardDailyHours" className="block text-xs font-semibold text-charcoal mb-1.5">
            Hours per day
          </label>
          <input
            id="att-standardDailyHours"
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
          />
          <p className="text-xs text-slate mt-1.5">Default 8h</p>
        </div>
        <div className="lg:col-span-2 bg-greenbg/40 border border-richgreen/20 rounded-lg px-4 py-3">
          <div className="text-xs font-semibold text-richgreen mb-1">Display only</div>
          <p className="text-xs text-charcoal">
            This is a display-only target. It does not deduct leave, trigger overtime, or affect
            payroll. Late marks (BL-027) and hours worked (BL-025) are independent.
          </p>
        </div>
      </div>
      <CardFooter onReset={onReset} onSave={onSave} isSaving={isSaving} />
    </div>
  );
}

// ── Card 3: Late Check-in Threshold ──────────────────────────────────────────

function LateCheckInCard({
  value,
  onChange,
  onSave,
  onReset,
  isSaving,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
}) {
  return (
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
          <label htmlFor="att-lateThreshold" className="block text-xs font-semibold text-charcoal mb-1.5">
            Threshold Time
          </label>
          <input
            id="att-lateThreshold"
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
          />
          <p className="text-xs text-slate mt-1.5">Default 10:30 AM</p>
        </div>
        <div className="lg:col-span-2 bg-umberbg/40 border border-umber/30 rounded-lg px-4 py-3">
          <div className="text-xs font-semibold text-umber mb-1">Penalty Rule</div>
          <p className="text-xs text-charcoal">
            3 late marks in a calendar month → <strong>1 full day deducted from annual leave</strong>.
            Each additional late mark beyond 3 = another full day deducted.
          </p>
          <p className="text-xs text-slate mt-1">This rule is fixed and not configurable.</p>
        </div>
      </div>
      <CardFooter onReset={onReset} onSave={onSave} isSaving={isSaving} />
    </div>
  );
}

// ── Card 4: Working Week & Holiday Calendar ───────────────────────────────────

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type DayAbbr = typeof DAYS_OF_WEEK[number];

// Static fallback holidays for 2026 (backend does not expose working-week
// config; the weekly-off field is also not in the AttendanceConfig contract).
const STATIC_HOLIDAYS_2026: Array<{ name: string; display: string; date: string }> = [
  { name: 'Republic Day',   display: 'Mon, 26 Jan 2026', date: '2026-01-26' },
  { name: 'Holi',           display: 'Tue, 3 Mar 2026',  date: '2026-03-03' },
  { name: 'Good Friday',    display: 'Fri, 3 Apr 2026',  date: '2026-04-03' },
  { name: 'Eid ul-Fitr',    display: 'Mon, 20 Apr 2026', date: '2026-04-20' },
  { name: 'Independence Day', display: 'Sat, 15 Aug 2026', date: '2026-08-15' },
  { name: 'Diwali',         display: 'Sun, 8 Nov 2026',  date: '2026-11-08' },
  { name: 'Christmas',      display: 'Fri, 25 Dec 2026', date: '2026-12-25' },
];

function formatHolidayDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function WorkingWeekCard() {
  // Weekly-off state — Sat + Sun default (prototype default).
  // No backend contract for weekly-off days — static local state only.
  const [weeklyOff, setWeeklyOff] = useState<Set<DayAbbr>>(new Set(['Sat', 'Sun']));

  const { data: holidayData } = useHolidays(2026);
  const holidays = holidayData ?? STATIC_HOLIDAYS_2026.map((h) => ({ id: h.date, date: h.date, name: h.name }));

  function toggleDay(day: DayAbbr) {
    setWeeklyOff((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
      <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
        Working Week &amp; Holiday Calendar
      </h3>
      <p className="text-xs text-slate mb-5">
        Used for attendance status derivation and payroll proration
      </p>

      {/* Weekly off days */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-charcoal mb-2">Weekly Off Days</label>
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Weekly off days">
          {DAYS_OF_WEEK.map((day) => {
            const isOff = weeklyOff.has(day);
            return (
              <label
                key={day}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isOff
                    ? 'border-2 border-forest bg-softmint'
                    : 'border border-sage/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOff}
                  onChange={() => toggleDay(day)}
                  className="accent-forest"
                />
                <span className={`text-sm ${isOff ? 'font-semibold text-forest' : ''}`}>
                  {day}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Public holidays */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-charcoal">Public Holidays — 2026</label>
          <button
            type="button"
            className="text-xs text-emerald font-semibold hover:underline"
            aria-label="Add holiday"
          >
            + Add Holiday
          </button>
        </div>
        <div className="bg-offwhite rounded-lg p-3 space-y-2">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm">
              <span className="text-charcoal">{h.name}</span>
              <span className="text-slate">{formatHolidayDate(h.date)}</span>
            </div>
          ))}
          {holidays.length === 0 && (
            <p className="text-xs text-slate text-center py-2">No holidays configured for 2026.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card 5: Leave Approval Escalation ────────────────────────────────────────

function LeaveEscalationCard({
  value,
  onChange,
  onSave,
  isSaving,
}: {
  value: number;
  onChange: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
      <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
        Leave Approval Escalation
      </h3>
      <p className="text-xs text-slate mb-5">
        If a Manager doesn&apos;t act on a leave request within this period, it auto-escalates to Admin
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <label htmlFor="att-escalation" className="block text-xs font-semibold text-charcoal mb-1.5">
            Escalation Period (working days)
          </label>
          <input
            id="att-escalation"
            type="number"
            value={value}
            min={1}
            max={14}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate mt-1.5">Default 5 working days</p>
        </div>
        <div className="bg-crimsonbg/40 border border-crimson/30 rounded-lg px-4 py-3">
          <div className="text-xs font-semibold text-crimson mb-1">No Auto-Approval</div>
          <p className="text-xs text-charcoal">
            Escalated leaves stay <strong>pending</strong> in the Admin queue. The system never
            auto-approves leave requests.
          </p>
        </div>
      </div>
      <CardFooter onSave={onSave} isSaving={isSaving} showReset={false} />
    </div>
  );
}

// ── Card 6: Event-Based Leaves ────────────────────────────────────────────────

function EventBasedLeavesCard({
  maternityWeeks,
  paternityDays,
  onMaternityChange,
  onPaternityChange,
  onSave,
  isSaving,
}: {
  maternityWeeks: number;
  paternityDays: number;
  onMaternityChange: (v: number) => void;
  onPaternityChange: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
      <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
        Event-Based Leaves
      </h3>
      <p className="text-xs text-slate mb-5">
        Maternity and paternity are event-based (one allocation per event; no balance tracked).
        Both are <strong>Admin-approved</strong>.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <label htmlFor="att-maternity" className="block text-xs font-semibold text-charcoal mb-1.5">
            Maternity Leave Maximum
          </label>
          <div className="flex items-center gap-2">
            <input
              id="att-maternity"
              type="number"
              value={maternityWeeks}
              min={1}
              max={52}
              onChange={(e) => onMaternityChange(parseInt(e.target.value, 10))}
              className="w-32 border border-sage/50 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate">weeks per event</span>
          </div>
          <p className="text-xs text-slate mt-1.5">Default 26 weeks · Approved by Admin</p>
        </div>
        <div>
          <label htmlFor="att-paternity" className="block text-xs font-semibold text-charcoal mb-1.5">
            Paternity Leave Maximum
          </label>
          <div className="flex items-center gap-2">
            <input
              id="att-paternity"
              type="number"
              value={paternityDays}
              min={1}
              max={60}
              onChange={(e) => onPaternityChange(parseInt(e.target.value, 10))}
              className="w-32 border border-sage/50 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate">working days per event</span>
          </div>
          <p className="text-xs text-slate mt-1.5">
            Default 10 working days · single block · must be claimed within 6 months of birth ·
            Approved by Admin
          </p>
        </div>
      </div>
      <CardFooter onSave={onSave} isSaving={isSaving} showReset={false} />
    </div>
  );
}

// ── Panel root ────────────────────────────────────────────────────────────────

export default function AttendanceConfigPanel() {
  // Attendance config (cards 2 + 3)
  const { data: attData, isLoading: attLoading, isError: attError } = useAttendanceConfig();
  const attMutation = useUpdateAttendanceConfig();

  const [standardHours, setStandardHours] = useState<number>(8);
  const [lateTime, setLateTime] = useState<string>('10:30');

  useEffect(() => {
    if (attData) {
      setStandardHours(attData.standardDailyHours);
      setLateTime(attData.lateThresholdTime);
    }
  }, [attData]);

  // Leave config (cards 5 + 6)
  const { data: leaveData, isLoading: leaveLoading, isError: leaveError } = useLeaveConfigSettings();
  const leaveMutation = useUpdateLeaveConfigSettings();

  // maternityDays in the contract is calendar days; prototype shows weeks.
  // Default: 182 days = 26 weeks.
  const [escalationDays, setEscalationDays] = useState<number>(5);
  const [maternityWeeks, setMaternityWeeks] = useState<number>(26);
  const [paternityDays, setPaternityDays] = useState<number>(10);

  useEffect(() => {
    if (leaveData) {
      setEscalationDays(leaveData.escalationPeriodDays);
      // Convert calendar days → weeks for display (182 → 26)
      setMaternityWeeks(Math.round(leaveData.maternityDays / 7));
      setPaternityDays(leaveData.paternityDays);
    }
  }, [leaveData]);

  // ── Save handlers ──────────────────────────────────────────────────────────

  async function saveStandardHours() {
    const body: AttendanceConfig = {
      lateThresholdTime: lateTime,
      standardDailyHours: Math.round(standardHours),
    };
    try {
      await attMutation.mutateAsync(body);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  function resetStandardHours() {
    setStandardHours(attData?.standardDailyHours ?? 8);
  }

  async function saveLateTime() {
    const body: AttendanceConfig = {
      lateThresholdTime: lateTime,
      standardDailyHours: Math.round(standardHours),
    };
    try {
      await attMutation.mutateAsync(body);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  function resetLateTime() {
    setLateTime(attData?.lateThresholdTime ?? '10:30');
  }

  async function saveEscalation() {
    if (!leaveData) return;
    try {
      await leaveMutation.mutateAsync({
        ...leaveData,
        escalationPeriodDays: escalationDays,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  async function saveEventLeaves() {
    if (!leaveData) return;
    try {
      await leaveMutation.mutateAsync({
        ...leaveData,
        maternityDays: maternityWeeks * 7,
        paternityDays: paternityDays,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (attLoading || leaveLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" aria-label="Loading attendance config" />
      </div>
    );
  }

  if (attError || leaveError) {
    return (
      <div
        className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson"
        role="alert"
      >
        Could not load attendance configuration. Please refresh.
      </div>
    );
  }

  return (
    <div>
      {/* Card 1 — informational */}
      <DailyAttendanceGenerationCard />

      {/* Card 2 — Standard Daily Working Hours */}
      <StandardDailyHoursCard
        value={standardHours}
        onChange={setStandardHours}
        onSave={saveStandardHours}
        onReset={resetStandardHours}
        isSaving={attMutation.isPending}
      />

      {/* Card 3 — Late Check-in Threshold */}
      <LateCheckInCard
        value={lateTime}
        onChange={setLateTime}
        onSave={saveLateTime}
        onReset={resetLateTime}
        isSaving={attMutation.isPending}
      />

      {/* Card 4 — Working Week & Holiday Calendar */}
      <WorkingWeekCard />

      {/* Card 5 — Leave Approval Escalation */}
      <LeaveEscalationCard
        value={escalationDays}
        onChange={setEscalationDays}
        onSave={saveEscalation}
        isSaving={leaveMutation.isPending}
      />

      {/* Card 6 — Event-Based Leaves */}
      <EventBasedLeavesCard
        maternityWeeks={maternityWeeks}
        paternityDays={paternityDays}
        onMaternityChange={setMaternityWeeks}
        onPaternityChange={setPaternityDays}
        onSave={saveEventLeaves}
        isSaving={leaveMutation.isPending}
      />
    </div>
  );
}
