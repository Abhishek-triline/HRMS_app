/**
 * MyOverviewHero — forest-gradient hero band shared by My Attendance and My Payslips.
 *
 * Visual reference: prototype/admin/my-attendance.html lines 4-29
 *                   prototype/admin/my-payslips.html  lines 4-29 (byte-identical decorations)
 *
 * The outer div carries the gradient + all atmospheric SVG/div decorations.
 * Content is passed via the `children` slot, rendered in a relative wrapper.
 */

import type { ReactNode } from 'react';

interface MyOverviewHeroProps {
  children: ReactNode;
  /** Extra Tailwind classes for the outer wrapper (e.g. custom mb-). Default: mb-6. */
  className?: string;
}

export function MyOverviewHero({ children, className = 'mb-6' }: MyOverviewHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl text-white p-6 shadow-2xl shadow-forest/40 ${className}`}
      style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #1C3D2E 25%, #2D7A5F 60%, #4DA37A 90%, #6FBE9E 100%)' }}
    >
      {/* Aurora shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(200,230,218,0.20) 48%, rgba(255,255,255,0.06) 52%, transparent 72%)' }}
        aria-hidden="true"
      />

      {/* Sun glow — top right */}
      <div
        className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,153,0.35) 0%, rgba(255,180,120,0.18) 28%, transparent 60%)', filter: 'blur(24px)' }}
        aria-hidden="true"
      />

      {/* Aurora streak — bottom left */}
      <div
        className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(111,190,158,0.45) 0%, rgba(45,122,95,0.20) 35%, transparent 65%)', filter: 'blur(36px)' }}
        aria-hidden="true"
      />

      {/* Wave SVG lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
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

      {/* Mountain silhouette — back layer */}
      <svg
        className="absolute inset-x-0 bottom-0 w-full opacity-25 pointer-events-none"
        viewBox="0 0 800 60"
        preserveAspectRatio="none"
        fill="#0F2E22"
        aria-hidden="true"
      >
        <path d="M0,60 L0,38 L70,18 L150,32 L230,14 L310,30 L390,8 L470,22 L550,12 L630,28 L710,16 L800,30 L800,60 Z" />
      </svg>

      {/* Mountain silhouette — front layer */}
      <svg
        className="absolute inset-x-0 bottom-0 w-full opacity-30 pointer-events-none"
        viewBox="0 0 800 40"
        preserveAspectRatio="none"
        fill="#1C3D2E"
        aria-hidden="true"
      >
        <path d="M0,40 L0,25 L60,10 L140,22 L220,5 L300,18 L380,2 L460,15 L540,6 L620,20 L700,8 L800,22 L800,40 Z" />
      </svg>

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.10] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        aria-hidden="true"
      />

      {/* Twinkling stars */}
      <div className="absolute top-6 right-1/4 w-1 h-1 rounded-full bg-white pointer-events-none" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.9)' }} aria-hidden="true" />
      <div className="absolute top-14 right-[38%] w-0.5 h-0.5 rounded-full bg-white/80 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-20 left-1/3 w-1 h-1 rounded-full bg-white/85 pointer-events-none" style={{ boxShadow: '0 0 5px rgba(255,255,255,0.7)' }} aria-hidden="true" />
      <div className="absolute top-9 left-[55%] w-0.5 h-0.5 rounded-full bg-white/60 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-24 right-[22%] w-1 h-1 rounded-full bg-mint pointer-events-none" style={{ boxShadow: '0 0 4px rgba(200,230,218,0.8)' }} aria-hidden="true" />
      <div className="absolute bottom-16 right-[30%] w-0.5 h-0.5 rounded-full bg-white/70 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-16 left-[18%] w-0.5 h-0.5 rounded-full bg-mint/80 pointer-events-none" aria-hidden="true" />

      {/* Content slot */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
