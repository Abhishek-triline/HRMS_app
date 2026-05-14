'use client';

/**
 * AttendanceCalendar — month grid with colour-coded status dots.
 *
 * - Keyboard-navigable: arrow keys move focus, Enter opens day detail.
 * - On mobile (≤768px) the grid collapses to a compact list.
 * - Respects prefers-reduced-motion for the dot animation.
 * - Used by E-05 My Attendance, M-05 Team Attendance, A-09 Org-wide.
 */

import { useState, useCallback, useMemo, useRef, KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP } from '@/lib/status/maps';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  /** INT status code: 1=Present, 2=Absent, 3=OnLeave, 4=WeeklyOff, 5=Holiday */
  status: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorkedMinutes: number | null;
  late: boolean;
  employeeName?: string;
  employeeCode?: string;
}

interface AttendanceCalendarProps {
  year: number;
  month: number; // 1-12
  days: CalendarDay[];
  onMonthChange: (year: number, month: number) => void;
  onDaySelect?: (day: CalendarDay) => void;
}

// ── Colours ───────────────────────────────────────────────────────────────────

const dotColour: Record<number, string> = {
  [ATTENDANCE_STATUS.Present]: 'bg-richgreen',
  [ATTENDANCE_STATUS.Absent]: 'bg-crimson',
  [ATTENDANCE_STATUS.OnLeave]: 'bg-forest',
  [ATTENDANCE_STATUS.WeeklyOff]: 'bg-slate/40',
  [ATTENDANCE_STATUS.Holiday]: 'bg-mint',
};

const cellBg: Record<number, string> = {
  [ATTENDANCE_STATUS.Present]: 'hover:bg-greenbg/60',
  [ATTENDANCE_STATUS.Absent]: 'hover:bg-crimsonbg/60',
  [ATTENDANCE_STATUS.OnLeave]: 'hover:bg-softmint/60',
  [ATTENDANCE_STATUS.WeeklyOff]: 'hover:bg-sage/20',
  [ATTENDANCE_STATUS.Holiday]: 'hover:bg-mint/20',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHHMM(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesToHM(mins: number | null): string {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0 = Sunday … 6 = Saturday; we want Mon=0
  const d = new Date(year, month - 1, 1).getDay();
  return (d + 6) % 7;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Day detail panel ──────────────────────────────────────────────────────────

function DayDetail({ day, onClose }: { day: CalendarDay; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Attendance for ${day.date}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-sage/20 w-full max-w-sm p-6">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate hover:bg-offwhite"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-xs text-slate uppercase tracking-widest font-semibold mb-1">Attendance</div>
        <div className="font-heading text-lg font-bold text-charcoal mb-4">{day.date}</div>
        {day.employeeName && (
          <div className="text-sm text-slate mb-3">{day.employeeName} ({day.employeeCode})</div>
        )}
        <div className="mb-3">
          <AttendanceStatusBadge status={day.status} />
          {day.late && (
            <span className="ml-2 text-xs font-bold text-umber bg-umberbg px-2 py-0.5 rounded">Late</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate mb-1">Check-in</div>
            <div className="font-semibold text-charcoal">{formatHHMM(day.checkInTime)}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">Check-out</div>
            <div className="font-semibold text-charcoal">{formatHHMM(day.checkOutTime)}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">Hours</div>
            <div className="font-semibold text-charcoal">{minutesToHM(day.hoursWorkedMinutes)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

export function AttendanceCalendar({
  year,
  month,
  days,
  onMonthChange,
  onDaySelect,
}: AttendanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dayMap = useMemo<Record<string, CalendarDay>>(() => {
    const map: Record<string, CalendarDay> = {};
    for (const d of days) {
      map[d.date] = d;
    }
    return map;
  }, [days]);

  const totalDays = getDaysInMonth(year, month);
  const firstOffset = getFirstDayOfMonth(year, month); // 0=Mon

  const prevMonth = useCallback(() => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }, [month, year, onMonthChange]);

  const nextMonth = useCallback(() => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }, [month, year, onMonthChange]);

  const goToday = useCallback(() => {
    const t = new Date();
    onMonthChange(t.getFullYear(), t.getMonth() + 1);
  }, [onMonthChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, dateStr: string) => {
      const d = dayMap[dateStr];
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (d) {
          setSelectedDay(d);
          onDaySelect?.(d);
        }
      }
      // Arrow key nav
      const day = parseInt(dateStr.split('-')[2], 10);
      const focusByDay = (targetDay: number) => {
        const td = String(Math.max(1, Math.min(totalDays, targetDay))).padStart(2, '0');
        const target = `${year}-${String(month).padStart(2, '0')}-${td}`;
        const el = gridRef.current?.querySelector<HTMLElement>(`[data-date="${target}"]`);
        el?.focus();
      };
      if (e.key === 'ArrowLeft') { e.preventDefault(); focusByDay(day - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); focusByDay(day + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); focusByDay(day - 7); }
      if (e.key === 'ArrowDown') { e.preventDefault(); focusByDay(day + 7); }
    },
    [dayMap, onDaySelect, totalDays, year, month],
  );

  // Build grid cells: offset blanks + day cells
  const cells: (number | null)[] = [
    ...Array<null>(firstOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-heading font-semibold text-charcoal">
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-sage/40 text-slate hover:bg-offwhite hover:text-charcoal transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToday}
            className="text-xs font-semibold text-forest hover:text-emerald px-2 py-1 rounded-lg border border-forest/30 hover:bg-softmint transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-sage/40 text-slate hover:bg-offwhite hover:text-charcoal transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1 hidden sm:grid" aria-hidden="true">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div ref={gridRef} className="grid grid-cols-7 gap-px" role="grid" aria-label={`${MONTH_NAMES[month - 1]} ${year} attendance calendar`}>
        {cells.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`blank-${idx}`} className="h-10" aria-hidden="true" />;
          }
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const entry = dayMap[dateStr];
          const isToday = dateStr === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={dateStr}
              data-date={dateStr}
              role="gridcell"
              tabIndex={0}
              aria-label={entry ? `${dateStr}: ${entry.status}${entry.late ? ', late' : ''}` : dateStr}
              onClick={() => {
                if (entry) {
                  setSelectedDay(entry);
                  onDaySelect?.(entry);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, dateStr)}
              className={clsx(
                'relative h-10 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
                entry ? cellBg[entry.status] : 'hover:bg-offwhite',
                isToday && 'ring-1 ring-forest ring-inset',
              )}
            >
              <span className={clsx('text-xs font-medium', isToday ? 'text-forest font-bold' : 'text-charcoal')}>
                {dayNum}
              </span>
              {entry && (
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full mt-0.5 motion-reduce:animate-none',
                    dotColour[entry.status],
                  )}
                  aria-hidden="true"
                />
              )}
              {entry?.late && (
                <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-umber" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile list fallback */}
      <div className="sm:hidden mt-4 divide-y divide-sage/20">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => {
              setSelectedDay(d);
              onDaySelect?.(d);
            }}
            className="w-full flex items-center justify-between py-3 text-sm hover:bg-offwhite transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
          >
            <div>
              <div className="font-medium text-charcoal">{d.date}</div>
              <div className="text-xs text-slate">{formatHHMM(d.checkInTime)} – {formatHHMM(d.checkOutTime)}</div>
            </div>
            <AttendanceStatusBadge status={d.status} />
          </button>
        ))}
        {days.length === 0 && (
          <p className="py-6 text-sm text-slate text-center">No attendance records for this month.</p>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate" aria-label="Status legend">
        {(Object.entries(dotColour) as [string, string][]).map(([codeStr, colour]) => {
          const code = Number(codeStr);
          const label = ATTENDANCE_STATUS_MAP[code]?.label ?? `Status ${code}`;
          return (
            <div key={codeStr} className="flex items-center gap-1.5">
              <span className={clsx('w-2 h-2 rounded-full', colour)} aria-hidden="true" />
              {label}
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-umber" aria-hidden="true" />
          Late
        </div>
      </div>

      {/* Day detail dialog */}
      {selectedDay && (
        <DayDetail day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </>
  );
}
