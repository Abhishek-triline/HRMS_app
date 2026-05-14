'use client';

/**
 * TimeOfDayHero — greeting banner that adapts to local hour.
 *
 * Four scenes:
 *   • morning (5–11)  — pre-dawn warm sky: maroon → magenta → peach with
 *                       mountain silhouettes and aurora streak.
 *   • day     (11–17) — forest brand palette: deep forest → emerald → mint.
 *                       Borrows the layered look directly from MyOverviewHero
 *                       so the dashboard reads on-brand at peak hours.
 *   • evening (17–19) — magenta / coral sunset.
 *   • night   (19–5)  — deep navy with twinkling stars.
 *
 * Markup is always identical; CSS in globals.css uses [data-tod="…"] to
 * hide/show the ornaments and recolour the layered fills per scene.
 */

import { useEffect, useState, type ReactNode } from 'react';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 17 && h < 19) return 'evening';
  if (h < 5 || h >= 19) return 'night';
  return 'day';
}

function greetingPrefix(tod: TimeOfDay): string {
  if (tod === 'morning') return 'Good morning';
  if (tod === 'evening') return 'Good evening';
  if (tod === 'night') return 'Good evening';
  return 'Good afternoon';
}

export interface TimeOfDayHeroProps {
  firstName: string;
  subtitle?: string;
  badge?: string;
  /**
   * Override for the auto-generated "Good morning, X" greeting. When set,
   * `firstName` is still required for the aria-label but the heading
   * renders whatever ReactNode you pass (e.g. "May Payroll").
   */
  customTitle?: ReactNode;
  /**
   * Override for the badge slot in the top-right corner. Use for CTAs
   * (e.g. an "Initiate run" link). When both `action` and `badge` are set,
   * `action` wins.
   */
  action?: ReactNode;
}

export function TimeOfDayHero({ firstName, subtitle, badge, customTitle, action }: TimeOfDayHeroProps) {
  const [tod, setTod] = useState<TimeOfDay>('day');

  useEffect(() => {
    setTod(getTimeOfDay());
    // Refresh on the hour boundary so a long-open tab transitions correctly.
    const id = setInterval(() => setTod(getTimeOfDay()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = `${greetingPrefix(tod)}, ${firstName}`;

  return (
    <div
      data-nx-hero
      data-tod={tod}
      className="relative rounded-2xl overflow-hidden mb-6 shadow-2xl shadow-forest/30"
      aria-label={`Dashboard hero — ${greeting}`}
    >
      {/* Aurora shimmer — diagonal light streak (morning + day only) */}
      <div className="nx-aurora absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Sun glow halo — soft warm blob behind the sun (morning + day) */}
      <div className="nx-sun-glow absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none" aria-hidden="true" />

      {/* Atmospheric streak — bottom-left ambient bloom (morning + day) */}
      <div className="nx-streak absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none" aria-hidden="true" />

      {/* Wave lines — flowing horizontal contours (morning + day) */}
      <svg
        className="nx-waves absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
        viewBox="0 0 800 240"
        preserveAspectRatio="none"
        fill="none"
        stroke="white"
        strokeWidth="1"
        aria-hidden="true"
      >
        <path d="M0,40 C150,10 300,70 450,30 S700,80 800,50" />
        <path d="M0,80 C150,50 300,110 450,70 S700,120 800,90" />
        <path d="M0,120 C150,90 300,150 450,110 S700,160 800,130" />
        <path d="M0,160 C150,130 300,190 450,150 S700,200 800,170" />
        <path d="M0,200 C150,170 300,230 450,190 S700,240 800,210" />
      </svg>

      {/* Mountain silhouettes — back layer */}
      <svg
        className="nx-mtn-back-svg absolute inset-x-0 bottom-0 w-full opacity-25 pointer-events-none"
        viewBox="0 0 800 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="nx-mtn-back" d="M0,60 L0,38 L70,18 L150,32 L230,14 L310,30 L390,8 L470,22 L550,12 L630,28 L710,16 L800,30 L800,60 Z" />
      </svg>

      {/* Mountain silhouettes — front layer */}
      <svg
        className="nx-mtn-front-svg absolute inset-x-0 bottom-0 w-full opacity-30 pointer-events-none"
        viewBox="0 0 800 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="nx-mtn-front" d="M0,40 L0,25 L60,10 L140,22 L220,5 L300,18 L380,2 L460,15 L540,6 L620,20 L700,8 L800,22 L800,40 Z" />
      </svg>

      {/* Dot-grid texture */}
      <svg
        className="nx-dotgrid absolute inset-0 w-full h-full opacity-[0.10] pointer-events-none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="nxHeroDots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#FFFFFF" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nxHeroDots)" />
      </svg>

      {/* Sun — visible morning + day (CSS hides it for evening/night) */}
      <div className="nx-sun absolute -top-6 -right-6 pointer-events-none" aria-hidden="true">
        <svg
          width="160"
          height="160"
          viewBox="0 0 220 220"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="nx-celestial"
        >
          <circle cx="110" cy="110" r="40" fill="currentColor" fillOpacity="0.30" />
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

      {/* Stars — night only (CSS hides for other tods) */}
      <div className="nx-stars absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="nx-star absolute top-[24%] left-[14%] w-1 h-1 rounded-full bg-white" />
        <span className="nx-star nx-s2 absolute top-[40%] left-[30%] w-0.5 h-0.5 rounded-full bg-white" />
        <span className="nx-star nx-s3 absolute top-[20%] left-[48%] w-1 h-1 rounded-full bg-white" />
        <span className="nx-star nx-s4 absolute top-[44%] left-[68%] w-0.5 h-0.5 rounded-full bg-white" />
        <span className="nx-star nx-s5 absolute top-[28%] left-[80%] w-1 h-1 rounded-full bg-white" />
      </div>

      {/* Ambient twinkles — morning + day. Mimics the scattered glints in
          MyOverviewHero so the dashboard hero matches that layered vibe. */}
      <div className="nx-ambient absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="absolute top-6 right-1/4 w-1 h-1 rounded-full bg-white" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.9)' }} />
        <span className="absolute top-14 right-[38%] w-0.5 h-0.5 rounded-full bg-white/80" />
        <span className="absolute top-20 left-1/3 w-1 h-1 rounded-full bg-white/85" style={{ boxShadow: '0 0 5px rgba(255,255,255,0.7)' }} />
        <span className="absolute top-9 left-[55%] w-0.5 h-0.5 rounded-full bg-white/60" />
        <span className="absolute top-16 left-[18%] w-0.5 h-0.5 rounded-full bg-white/70" />
      </div>

      {/* Foreground content */}
      <div className="relative px-6 py-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white">
            {customTitle ?? greeting}
          </h2>
          {subtitle && (
            <p className="text-sm text-mint/80 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action ?? (badge && (
          <span className="bg-white/15 backdrop-blur-sm border border-white/30 text-white text-xs uppercase tracking-widest font-semibold px-3 py-1.5 rounded-full">
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
