import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — Nexora HRMS',
};

/**
 * Employee Dashboard — Phase 0 stub.
 * Full implementation in Phase 3 (employee module).
 */
export default function EmployeeDashboardPage() {
  return (
    <div>
      <div
        data-nx-hero
        data-tod="day"
        className="relative rounded-2xl overflow-hidden mb-6 shadow-lg shadow-forest/10 px-6 py-6"
        aria-label="Dashboard hero"
      >
        <svg className="absolute inset-0 w-full h-full opacity-[0.10] pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="empDots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="#FFFFFF" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#empDots)" />
        </svg>
        <div className="nx-b1 absolute -top-16 -left-12 w-[18rem] h-[18rem] rounded-full bg-emerald/40 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">My Dashboard</h2>
            <p className="text-sm text-mint/80 mt-0.5">Phase 0 scaffold — full dashboard coming in Phase 3</p>
          </div>
          <span className="bg-white/15 backdrop-blur-sm border border-white/30 text-white text-xs uppercase tracking-widest font-semibold px-3 py-1.5 rounded-full">
            Employee Panel
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {['Leave Balance', 'Attendance This Month', 'Latest Payslip', 'Review Status'].map((tile) => (
          <div key={tile} className="bg-white rounded-xl border border-sage/30 px-5 py-4">
            <div className="text-[11px] font-semibold text-slate uppercase tracking-widest mb-2">{tile}</div>
            <div className="h-7 w-16 bg-sage/20 rounded animate-pulse" />
            <div className="h-3 w-28 bg-sage/10 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
