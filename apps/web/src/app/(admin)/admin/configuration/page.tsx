'use client';

/**
 * Configuration Hub — Admin.
 * Visual reference: prototype/admin/config.html (tab nav style)
 *
 * Card grid linking to:
 * - Attendance Config  /admin/config/attendance
 * - Leave Config       /admin/config/leave
 * - Tax Settings       /admin/tax-config
 * - Holiday Calendar   /admin/holidays
 */

import Link from 'next/link';
import { useAttendanceConfig } from '@/features/admin/hooks/useAttendanceConfig';
import { useLeaveConfigSettings } from '@/features/admin/hooks/useLeaveConfigSettings';

interface ConfigCard {
  title: string;
  description: string;
  href: string;
  iconPath: string;
  summary?: React.ReactNode;
}

function CardIcon({ path }: { path: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-softmint flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </div>
  );
}

function AttendanceSummary() {
  const { data } = useAttendanceConfig();
  if (!data) return <span className="text-slate text-xs italic">—</span>;
  return (
    <span className="text-slate text-xs">
      Late threshold: <strong className="text-charcoal">{data.lateThresholdTime}</strong>
      &nbsp;· Daily hours: <strong className="text-charcoal">{data.standardDailyHours}h</strong>
    </span>
  );
}

function LeaveSummary() {
  const { data } = useLeaveConfigSettings();
  if (!data) return <span className="text-slate text-xs italic">—</span>;
  return (
    <span className="text-slate text-xs">
      Escalation: <strong className="text-charcoal">{data.escalationPeriodDays}d</strong>
      &nbsp;· Maternity: <strong className="text-charcoal">{data.maternityDays} days</strong>
      &nbsp;· Paternity: <strong className="text-charcoal">{data.paternityDays} days</strong>
    </span>
  );
}

export default function ConfigurationHubPage() {
  const cards: ConfigCard[] = [
    {
      title: 'Attendance',
      description: 'Late check-in threshold and standard daily working hours. Affects attendance status derivation and payroll proration.',
      href: '/admin/config/attendance',
      iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      title: 'Leave Config',
      description: 'Carry-forward caps, escalation period, and Maternity / Paternity event maximums.',
      href: '/admin/config/leave',
      iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      title: 'Tax Settings',
      description: 'v1 reference rate used to suggest tax per payslip. PayrollOfficer can override per row.',
      href: '/admin/tax-config',
      iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      title: 'Holiday Calendar',
      description: 'Manage public holidays for each year. Used for attendance status derivation and payroll proration.',
      href: '/admin/holidays',
      iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      title: 'Leave Quotas',
      description: 'Per-type carry-forward caps and per-employment-type quota matrix (annual days per leave type).',
      href: '/admin/leave-config',
      iconPath: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-charcoal">System Configuration</h1>
        <p className="text-sm text-slate mt-1">
          Admin-only settings that govern how the HRMS behaves across all modules.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-xl shadow-sm border border-sage/30 p-5 flex flex-col gap-4 hover:border-forest/40 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <CardIcon path={card.iconPath} />
              <div className="min-w-0">
                <h2 className="font-heading text-sm font-bold text-charcoal group-hover:text-forest transition-colors">
                  {card.title}
                </h2>
                <p className="text-xs text-slate mt-1 leading-relaxed">{card.description}</p>
              </div>
            </div>

            {/* Per-card live summary */}
            <div className="mt-auto pt-3 border-t border-sage/20">
              {card.href === '/admin/config/attendance' ? (
                <AttendanceSummary />
              ) : card.href === '/admin/config/leave' ? (
                <LeaveSummary />
              ) : (
                <span className="text-[11px] text-slate flex items-center gap-1 group-hover:text-forest transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Edit settings
                </span>
              )}
            </div>
          </Link>
        ))}

        {/* Future slot */}
        <div className="bg-offwhite/60 border border-sage/20 border-dashed rounded-xl p-5 flex items-center justify-center min-h-[120px]">
          <p className="text-xs text-slate text-center">
            <span className="font-semibold text-slate/80">More settings coming in v2</span>
            <br />
            Slab tax engine, org-level branding, SMTP
          </p>
        </div>
      </div>
    </div>
  );
}
