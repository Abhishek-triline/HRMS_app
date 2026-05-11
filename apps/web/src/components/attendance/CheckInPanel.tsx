'use client';

/**
 * CheckInPanel — three-state check-in/out panel.
 *
 * States driven by useTodayAttendance() panelState:
 *   Ready   — pre-check-in; shows live clock + Check In CTA
 *   Working — checked in; shows elapsed time + Check Out CTA
 *   Confirm — checked out; shows summary + Undo link
 *
 * Visual reference: prototype/employee/checkin.html (cinematic hero scene).
 * The #nx-tod-demo and #nx-state-demo docks are NOT rendered (SRS § 10).
 * Time-of-day theming is applied via CSS data-tod attribute.
 */

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useTodayAttendance, useCheckIn, useCheckOut, useUndoCheckOut } from '@/lib/hooks/useAttendance';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime12(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatHHMM(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesToHM(mins: number | null): string {
  if (mins === null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getTimeTod(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 17 && h < 19) return 'evening';
  if (h < 5 || h >= 19) return 'night';
  return 'day';
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Cinematic hero background ─────────────────────────────────────────────────

function HeroBackground({ tod }: { tod: string }) {
  return (
    <>
      {/* Dot grid */}
      <svg
        className="nx-dotgrid absolute inset-0 w-full h-full opacity-[0.10] pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <pattern id="nxHeroDots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#FFFFFF" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nxHeroDots)" />
      </svg>

      {/* Blobs */}
      <div className="nx-b1 absolute -top-24 -left-20 w-[26rem] h-[26rem] rounded-full bg-emerald/45 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="nx-b2 absolute -bottom-32 -right-24 w-[32rem] h-[32rem] rounded-full bg-mint/30 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="nx-b3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full bg-emerald/25 blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Celestial body */}
      <div className="nx-sun absolute -top-8 -right-8 pointer-events-none" aria-hidden="true">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="nx-celestial"
        >
          <circle cx="110" cy="110" r="40" fill="currentColor" fillOpacity="0.35" />
          <circle cx="110" cy="110" r="55" strokeOpacity="0.4" />
          <circle cx="110" cy="110" r="74" strokeOpacity="0.18" />
          <g strokeOpacity="0.35">
            <line x1="110" y1="20" x2="110" y2="40" />
            <line x1="110" y1="180" x2="110" y2="200" />
            <line x1="20" y1="110" x2="40" y2="110" />
            <line x1="180" y1="110" x2="200" y2="110" />
            <line x1="46" y1="46" x2="60" y2="60" />
            <line x1="160" y1="160" x2="174" y2="174" />
            <line x1="160" y1="60" x2="174" y2="46" />
            <line x1="46" y1="174" x2="60" y2="160" />
          </g>
        </svg>
      </div>

      {/* Stars — night only */}
      {tod === 'night' && (
        <div className="nx-stars absolute inset-0 pointer-events-none" aria-hidden="true">
          <span className="absolute top-[14%] left-[12%] w-1 h-1 rounded-full bg-white" />
          <span className="absolute top-[22%] left-[28%] w-0.5 h-0.5 rounded-full bg-white" />
          <span className="absolute top-[10%] left-[44%] w-1 h-1 rounded-full bg-white" />
          <span className="absolute top-[26%] left-[62%] w-0.5 h-0.5 rounded-full bg-white" />
          <span className="absolute top-[16%] left-[78%] w-1 h-1 rounded-full bg-white" />
          <span className="absolute top-[34%] left-[20%] w-0.5 h-0.5 rounded-full bg-white" />
          <span className="absolute top-[40%] left-[88%] w-1 h-1 rounded-full bg-white" />
        </div>
      )}

      {/* Clouds — day only */}
      {(tod === 'day' || tod === 'morning') && (
        <div className="nx-clouds absolute inset-0 pointer-events-none" aria-hidden="true">
          <svg className="nx-cloud absolute top-[18%] w-32 opacity-80" viewBox="0 0 120 50" fill="#FFFFFF" fillOpacity="0.85">
            <ellipse cx="30" cy="30" rx="18" ry="14" /><ellipse cx="55" cy="25" rx="22" ry="17" />
            <ellipse cx="80" cy="32" rx="20" ry="14" /><ellipse cx="95" cy="30" rx="14" ry="11" />
          </svg>
          <svg className="absolute top-[34%] w-24 opacity-70" viewBox="0 0 120 50" fill="#FFFFFF" fillOpacity="0.78">
            <ellipse cx="30" cy="30" rx="15" ry="12" /><ellipse cx="55" cy="26" rx="20" ry="15" />
            <ellipse cx="80" cy="32" rx="17" ry="12" />
          </svg>
        </div>
      )}

      {/* Mountain silhouettes */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full pointer-events-none"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        style={{ height: '160px' }}
        aria-hidden="true"
      >
        <path
          className="nx-mtn-back"
          fill="#1A2420"
          fillOpacity="0.35"
          d="M0,180 L150,90 L300,150 L450,70 L600,140 L750,80 L900,160 L1050,90 L1200,150 L1200,220 L0,220 Z"
        />
        <path
          className="nx-mtn-front"
          fill="#1A2420"
          fillOpacity="0.6"
          d="M0,200 L120,140 L260,190 L420,120 L560,180 L720,130 L860,200 L1000,150 L1140,200 L1200,180 L1200,220 L0,220 Z"
        />
      </svg>

      {/* Mint dust */}
      <div className="absolute bottom-12 left-[18%] w-1.5 h-1.5 rounded-full bg-mint pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-16 left-[34%] w-1 h-1 rounded-full bg-mint pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-20 left-[58%] w-1.5 h-1.5 rounded-full bg-mint pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-10 left-[72%] w-1 h-1 rounded-full bg-mint pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-14 left-[86%] w-1.5 h-1.5 rounded-full bg-mint pointer-events-none" aria-hidden="true" />
    </>
  );
}

// ── Ready panel ───────────────────────────────────────────────────────────────

interface ReadyPanelProps {
  now: Date;
  lateThreshold: string;
  lateMonthCount: number;
  firstName: string;
  onCheckIn: () => void;
  isLoading: boolean;
}

function ReadyPanel({ now, lateThreshold, lateMonthCount, firstName, onCheckIn, isLoading }: ReadyPanelProps) {
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const timeStr = `${h12}:${m}:${s} ${ampm}`;
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="nx-panel bg-white/95 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl shadow-forest/30 px-10 py-8 w-full max-w-md text-center">
      <div className="inline-flex items-center gap-2 bg-mint/40 border border-forest/30 rounded-full px-3 py-1 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" aria-hidden="true" />
        <span className="text-[11px] font-bold text-forest uppercase tracking-widest">Ready to Start</span>
      </div>

      <div aria-live="polite" aria-label={`Current time: ${timeStr}`}>
        <div className="font-heading text-5xl font-bold text-charcoal tracking-tight leading-none">
          {timeStr}
        </div>
      </div>
      <div className="text-slate text-sm mt-2">{dateStr}</div>

      <p className="text-slate text-sm mt-5 leading-relaxed">
        Good morning, <span className="font-semibold text-charcoal">{firstName}</span>.
        <br />Tap below to start your workday.
      </p>

      <Button
        variant="primary"
        size="lg"
        onClick={onCheckIn}
        loading={isLoading}
        disabled={isLoading}
        className="mt-7 bg-gradient-to-r from-forest to-emerald hover:from-emerald hover:to-richgreen uppercase tracking-wide"
        leadingIcon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4 4-4 4M7 12h14" />
          </svg>
        }
      >
        Check In
      </Button>

      <div className="mt-6 pt-4 border-t border-sage/30 flex items-center justify-center gap-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-umber" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-slate">Late after</span>
          <span className="font-semibold text-umber">{lateThreshold}</span>
        </div>
        <span className="text-sage">·</span>
        <span className="text-slate">
          <span className="font-semibold text-charcoal">{lateMonthCount}</span> of 3 late marks this month
        </span>
      </div>
    </div>
  );
}

// ── Working panel ─────────────────────────────────────────────────────────────

interface WorkingPanelProps {
  now: Date;
  checkInIso: string;
  standardDailyHours: number;
  onCheckOut: () => void;
  isLoading: boolean;
}

function WorkingPanel({ now, checkInIso, standardDailyHours, onCheckOut, isLoading }: WorkingPanelProps) {
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const timeStr = `${h12}:${m}:${s} ${ampm}`;
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const checkInDate = new Date(checkInIso);
  const workedMs = now.getTime() - checkInDate.getTime();
  const workedMins = Math.max(0, Math.floor(workedMs / 60_000));
  const targetMins = standardDailyHours * 60;
  const remainingMins = Math.max(0, targetMins - workedMins);
  const pct = Math.min(100, Math.round((workedMins / targetMins) * 100));

  return (
    <div className="nx-panel bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl shadow-forest/30 px-10 py-8 w-full max-w-md text-center">
      <div className="inline-flex items-center gap-2 bg-greenbg/70 border border-richgreen/30 rounded-full px-3 py-1 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-richgreen animate-pulse" aria-hidden="true" />
        <span className="text-[11px] font-bold text-richgreen uppercase tracking-widest">Currently Working</span>
      </div>

      <div aria-live="polite" aria-label={`Current time: ${timeStr}`}>
        <div className="font-heading text-5xl font-bold text-charcoal tracking-tight leading-none">
          {timeStr}
        </div>
      </div>
      <div className="text-slate text-sm mt-2">{dateStr}</div>

      <div className="grid grid-cols-3 gap-2 mt-6 text-sm">
        <div>
          <div className="text-[10px] text-slate uppercase tracking-widest font-semibold mb-0.5">Checked in</div>
          <div className="font-semibold text-charcoal">{formatHHMM(checkInIso)}</div>
        </div>
        <div className="border-l border-r border-sage/30">
          <div className="text-[10px] text-slate uppercase tracking-widest font-semibold mb-0.5">Worked</div>
          <div className="font-semibold text-charcoal">{minutesToHM(workedMins)}</div>
        </div>
        <div>
          <div className="text-[10px] text-umber uppercase tracking-widest font-semibold mb-0.5">Remaining</div>
          <div className="font-semibold text-umber">{minutesToHM(remainingMins)}</div>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onCheckOut}
        loading={isLoading}
        disabled={isLoading}
        className="mt-7 bg-forest hover:bg-emerald uppercase tracking-wide"
        leadingIcon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        }
      >
        Check Out
      </Button>

      <div className="mt-5">
        <div className="w-full bg-sage/30 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% of ${standardDailyHours}h workday complete`}>
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-forest to-emerald motion-reduce:transition-none transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[10px] text-slate mt-1.5 uppercase tracking-widest font-semibold">
          {pct}% of {standardDailyHours}h day
        </div>
      </div>
    </div>
  );
}

// ── Confirm panel ─────────────────────────────────────────────────────────────

interface ConfirmPanelProps {
  checkInIso: string;
  checkOutIso: string;
  hoursWorkedMinutes: number | null;
  onUndo: () => void;
  isLoading: boolean;
}

function ConfirmPanel({ checkInIso, checkOutIso, hoursWorkedMinutes, onUndo, isLoading }: ConfirmPanelProps) {
  return (
    <div className="nx-confirm bg-white/95 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl shadow-forest/30 px-10 py-10 w-full max-w-md text-center">
      <div className="w-16 h-16 rounded-full bg-greenbg flex items-center justify-center mx-auto mb-4" aria-hidden="true">
        <svg className="w-9 h-9 text-richgreen" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="font-heading text-2xl font-bold text-charcoal">Checked out</div>
      <div className="text-slate text-sm mt-1">See you tomorrow, have a great evening.</div>

      <div className="grid grid-cols-3 gap-2 mt-6 text-sm">
        <div>
          <div className="text-[10px] text-slate uppercase tracking-widest font-semibold mb-0.5">Check-in</div>
          <div className="font-semibold text-charcoal">{formatHHMM(checkInIso)}</div>
        </div>
        <div className="border-l border-r border-sage/30">
          <div className="text-[10px] text-slate uppercase tracking-widest font-semibold mb-0.5">Check-out</div>
          <div className="font-semibold text-charcoal">{formatHHMM(checkOutIso)}</div>
        </div>
        <div>
          <div className="text-[10px] text-richgreen uppercase tracking-widest font-semibold mb-0.5">Total</div>
          <div className="font-semibold text-richgreen">{minutesToHM(hoursWorkedMinutes)}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onUndo}
        disabled={isLoading}
        className="text-xs text-emerald font-semibold hover:underline mt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded disabled:opacity-50"
      >
        {isLoading ? 'Undoing…' : 'Undo (still working) →'}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CheckInPanelProps {
  firstName?: string;
}

export function CheckInPanel({ firstName = 'there' }: CheckInPanelProps) {
  const now = useLiveClock();
  const tod = getTimeTod();
  const { data, isLoading: isTodayLoading, isError, error } = useTodayAttendance();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const undoCheckOutMutation = useUndoCheckOut();

  const handleCheckIn = useCallback(() => {
    checkInMutation.mutate();
  }, [checkInMutation]);

  const handleCheckOut = useCallback(() => {
    checkOutMutation.mutate();
  }, [checkOutMutation]);

  const handleUndo = useCallback(() => {
    undoCheckOutMutation.mutate();
  }, [undoCheckOutMutation]);

  const panelState = data?.panelState ?? 'Ready';
  const record = data?.record ?? null;
  const lateThreshold = data?.lateThreshold ?? '10:30';
  const standardDailyHours = data?.standardDailyHours ?? 8;
  const lateMonthCount = data?.lateMonthCount ?? 0;

  if (isError) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="rounded-2xl bg-crimsonbg border border-crimson/40 p-6 mb-5 text-crimson text-sm" role="alert">
        Failed to load attendance status: {errMsg}
      </div>
    );
  }

  return (
    <div
      data-nx-hero
      data-tod={tod}
      className="relative rounded-2xl overflow-hidden mb-5 shadow-lg shadow-forest/10"
    >
      <HeroBackground tod={tod} />

      {/* Glass panel foreground */}
      <div className="relative px-8 py-12 flex justify-center">
        {isTodayLoading && (
          <div className="nx-panel bg-white/95 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl shadow-forest/30 px-10 py-8 w-full max-w-md text-center">
            <div className="inline-flex items-center gap-2 bg-mint/40 border border-forest/30 rounded-full px-3 py-1 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" aria-hidden="true" />
              <span className="text-[11px] font-bold text-forest uppercase tracking-widest">Loading</span>
            </div>
            <div className="h-12 w-48 mx-auto bg-sage/20 rounded animate-pulse" />
            <div className="h-3 w-40 mx-auto mt-3 bg-sage/15 rounded animate-pulse" />
            <div className="h-3 w-56 mx-auto mt-5 bg-sage/10 rounded animate-pulse" />
            <div className="h-11 w-40 mx-auto mt-7 bg-forest/15 rounded animate-pulse" />
          </div>
        )}
        {!isTodayLoading && panelState === 'Ready' && (
          <ReadyPanel
            now={now}
            lateThreshold={lateThreshold}
            lateMonthCount={lateMonthCount}
            firstName={firstName}
            onCheckIn={handleCheckIn}
            isLoading={checkInMutation.isPending}
          />
        )}
        {!isTodayLoading && panelState === 'Working' && (
          <WorkingPanel
            now={now}
            checkInIso={record?.checkInTime ?? new Date().toISOString()}
            standardDailyHours={standardDailyHours}
            onCheckOut={handleCheckOut}
            isLoading={checkOutMutation.isPending}
          />
        )}
        {!isTodayLoading && panelState === 'Confirm' && (
          <ConfirmPanel
            checkInIso={record?.checkInTime ?? ''}
            checkOutIso={record?.checkOutTime ?? ''}
            hoursWorkedMinutes={record?.hoursWorkedMinutes ?? null}
            onUndo={handleUndo}
            isLoading={undoCheckOutMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
