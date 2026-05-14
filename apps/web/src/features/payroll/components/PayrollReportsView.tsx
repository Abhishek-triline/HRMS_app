'use client';

/**
 * PayrollReportsView — shared Payroll Reports page body used by Admin and
 * PayrollOfficer routes. Both roles see the same report catalogue and the
 * same filter bar; download buttons are stubbed pending v1.1 backend.
 *
 * Visual reference: prototype/payroll-officer/reports.html
 */

import { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRefreshed(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DownloadButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}

function DownloadButton({ label, variant = 'secondary', onClick }: DownloadButtonProps) {
  if (variant === 'primary') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-forest text-white hover:bg-emerald px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-forest/40 min-h-[36px]"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-sage/50 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate hover:bg-offwhite transition-colors focus:outline-none focus:ring-2 focus:ring-forest/20 min-h-[36px]"
    >
      {label}
    </button>
  );
}

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  buttons: Array<{ label: string; variant?: 'primary' | 'secondary' }>;
  onDownload: (label: string) => void;
}

function ReportCard({ icon, title, subtitle, description, buttons, onDownload }: ReportCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-softmint flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
          <p className="text-xs text-slate">{subtitle}</p>
        </div>
      </div>
      <p className="text-xs text-slate mb-4">{description}</p>
      <div className="flex gap-2 flex-wrap">
        {buttons.map((btn) => (
          <DownloadButton
            key={btn.label}
            label={btn.label}
            variant={btn.variant ?? 'secondary'}
            onClick={() => onDownload(btn.label)}
          />
        ))}
      </div>
    </div>
  );
}

// ── SVG icons (lifted verbatim from prototype) ────────────────────────────────

const IconSalaryRegister = (
  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconBankTransfer = (
  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const IconTDS = (
  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconLOP = (
  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconForm16 = (
  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const IconDeptCost = (
  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
  </svg>
);

// ── Report card data ──────────────────────────────────────────────────────────

const REPORT_CARDS: Array<Omit<ReportCardProps, 'onDownload'>> = [
  {
    icon: IconSalaryRegister,
    title: 'Salary Register',
    subtitle: 'All payslips with gross/deductions/net',
    description:
      'Standard monthly register showing every payslip line — basic, allowances, LOP, tax, net. Required for finance reconciliation.',
    buttons: [
      { label: 'Download CSV', variant: 'primary' },
      { label: 'Download PDF' },
    ],
  },
  {
    icon: IconBankTransfer,
    title: 'Bank Transfer File',
    subtitle: 'For HDFC Corporate Net Banking upload',
    description:
      'Bank-formatted file containing IFSC, account number, and net pay for each employee. Generates after run finalisation.',
    buttons: [
      { label: 'Download .txt', variant: 'primary' },
      { label: 'XML format' },
    ],
  },
  {
    icon: IconTDS,
    title: 'TDS Report',
    subtitle: 'Form 24Q quarterly summary',
    description:
      'TDS deducted per employee with PAN, gross taxable income, and tax. Compatible with Indian quarterly filing.',
    buttons: [
      { label: 'Download CSV', variant: 'primary' },
      { label: 'Form 24Q' },
    ],
  },
  {
    icon: IconLOP,
    title: 'LOP Summary',
    subtitle: 'Loss-of-pay days and deductions',
    description:
      'Per-employee LOP days vs deductions, useful for HR audits and explaining net-pay variance to employees.',
    buttons: [{ label: 'Download CSV', variant: 'primary' }],
  },
  {
    icon: IconForm16,
    title: 'Form 16 — Annual',
    subtitle: 'Per-employee tax certificates',
    description:
      'Year-end Form 16s for all active employees. Includes Part A (TDS summary) and Part B (income breakdown). Available after fiscal year close.',
    buttons: [
      { label: 'Bulk Download (zip)', variant: 'primary' },
      { label: 'Per-employee' },
    ],
  },
  {
    icon: IconDeptCost,
    title: 'Department-wise Cost',
    subtitle: 'Salary cost split by department',
    description:
      'Total payroll cost grouped by department, useful for finance forecasting and budget tracking.',
    buttons: [{ label: 'Download CSV', variant: 'primary' }],
  },
];

// ── Filter options ────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const FY_OPTIONS = [
  `FY ${CURRENT_YEAR}-${String(CURRENT_YEAR + 1).slice(2)}`,
  `FY ${CURRENT_YEAR - 1}-${String(CURRENT_YEAR).slice(2)}`,
  `FY ${CURRENT_YEAR - 2}-${String(CURRENT_YEAR - 1).slice(2)}`,
];

const MONTH_OPTIONS = [
  'All Months',
  'Apr 2026',
  'May 2026',
  'Mar 2026',
  'Feb 2026',
  'Jan 2026',
  'Dec 2025',
];

const DEPT_OPTIONS = [
  'All Departments',
  'Engineering',
  'Design',
  'Finance',
  'HR',
  'Operations',
];

// ── PayrollReportsView ────────────────────────────────────────────────────────

export function PayrollReportsView() {
  const toast = useToast();

  const [fy, setFy] = useState(FY_OPTIONS[0]);
  const [month, setMonth] = useState('All Months');
  const [department, setDepartment] = useState('All Departments');

  const refreshedAt = formatRefreshed(new Date());

  function handleDownload(reportTitle: string, buttonLabel: string) {
    toast.info('Coming soon', `${reportTitle} — ${buttonLabel} export is wired in v1.1.`);
  }

  return (
    <>
      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 mb-5 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-charcoal">Period:</span>

        <select
          value={fy}
          onChange={(e) => setFy(e.target.value)}
          className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
          aria-label="Fiscal year"
        >
          {FY_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
          aria-label="Month"
        >
          {MONTH_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
          aria-label="Department"
        >
          {DEPT_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-slate">Last refreshed: {refreshedAt}</span>
      </div>

      {/* Report cards — 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {REPORT_CARDS.map((card) => (
          <ReportCard
            key={card.title}
            {...card}
            onDownload={(btnLabel) => handleDownload(card.title, btnLabel)}
          />
        ))}
      </div>

      {/* Recent Downloads */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <div className="px-5 py-4 border-b border-sage/20">
          <h3 className="text-sm font-semibold text-charcoal">Recent Downloads</h3>
        </div>
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-slate">No recent downloads — exports become available in v1.1.</p>
        </div>
      </div>
    </>
  );
}
