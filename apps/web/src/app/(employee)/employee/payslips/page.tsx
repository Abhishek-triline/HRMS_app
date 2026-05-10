'use client';

/**
 * E-08 — My Payslips (Employee).
 * Visual reference: prototype/employee/my-payslips.html
 *
 * Shows the authenticated employee's own payslip history.
 * Sections:
 *   - YTD hero card (gross / tax / net computed from payslip list)
 *   - Payslip table (Month / Working Days / LOP Days / Gross / Tax / Net / Status / Download)
 *   - LOP formula footer (when any payslip has lopDays > 0)
 *   - Finalised-immutable info card
 */

import { useState, useMemo } from 'react';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { downloadPayslipPdf } from '@/lib/api/payroll';
import { PayslipTable } from '@/components/payroll/PayslipTable';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { PayslipSummary } from '@nexora/contracts/payroll';

// ── Money helpers ─────────────────────────────────────────────────────────────

function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.floor(paise / 100));
}

// ── YTD Hero ──────────────────────────────────────────────────────────────────

function YTDHeroSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6 px-8 py-6 text-white animate-pulse"
      style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #2D7A5F 50%, #6FBE9E 100%)' }}
    >
      <div className="h-4 bg-white/20 rounded w-48 mb-4" />
      <div className="grid grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="h-3 bg-white/20 rounded w-24 mb-2" />
            <div className="h-8 bg-white/20 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface YTDHeroProps {
  payslips: PayslipSummary[];
  isLoading: boolean;
}

function YTDHero({ payslips, isLoading }: YTDHeroProps) {
  const ytdGross = useMemo(() => payslips.reduce((s, p) => s + p.grossPaise, 0), [payslips]);
  const ytdTax = useMemo(() => payslips.reduce((s, p) => s + p.finalTaxPaise, 0), [payslips]);
  const ytdNet = useMemo(() => payslips.reduce((s, p) => s + p.netPayPaise, 0), [payslips]);
  const monthCount = payslips.length;

  if (isLoading) return <YTDHeroSkeleton />;

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6 px-8 py-6 text-white shadow-2xl shadow-forest/40"
      style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #1C3D2E 25%, #2D7A5F 60%, #4DA37A 90%, #6FBE9E 100%)' }}
    >
      {/* Aurora shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(200,230,218,0.20) 48%, rgba(255,255,255,0.06) 52%, transparent 72%)' }}
        aria-hidden="true"
      />
      {/* Sun glow top-right */}
      <div
        className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,153,0.35) 0%, rgba(255,180,120,0.18) 28%, transparent 60%)', filter: 'blur(24px)' }}
        aria-hidden="true"
      />
      {/* Aurora streak bottom-left */}
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
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.10] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Year-to-Date Summary</p>
            <p className="font-heading text-lg font-bold mt-0.5">YTD Earnings</p>
          </div>
          {monthCount > 0 && (
            <span className="bg-white/10 border border-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
              {monthCount} {monthCount === 1 ? 'month' : 'months'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70 mb-1">Gross Earned</p>
            <p className="font-heading text-2xl font-bold">{formatPaise(ytdGross)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70 mb-1">Tax Paid (TDS)</p>
            <p className="font-heading text-2xl font-bold">{formatPaise(ytdTax)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70 mb-1">Net Received</p>
            <p className="font-heading text-3xl font-bold text-mint">{formatPaise(ytdNet)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LOP formula footer ────────────────────────────────────────────────────────

function LOPFormulaFooter({ payslips }: { payslips: PayslipSummary[] }) {
  const hasLop = payslips.some((p) => p.lopDays > 0);
  if (!hasLop) return null;

  return (
    <div className="px-6 py-3 bg-umberbg/60 border-t border-umber/10 rounded-b-xl">
      <p className="text-xs text-umber italic">
        Note: Months with LOP show a deduction. Formula:{' '}
        <strong>gross &divide; workingDays &times; lopDays = deducted</strong>{' '}
        is subtracted from the gross to compute the adjusted earnings.
      </p>
    </div>
  );
}

// ── Info card ─────────────────────────────────────────────────────────────────

function FinalisedInfoCard() {
  return (
    <div className="bg-softmint border border-mint/30 rounded-xl px-5 py-3 mt-6 text-sm text-forest flex items-start gap-3">
      <svg className="w-5 h-5 text-forest mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <div>
        <p className="font-semibold text-forest mb-0.5">Payslips are finalised and immutable.</p>
        <p className="text-xs text-slate">
          Any tax or earnings adjustment is reflected in a subsequent month&apos;s payslip,
          with a clearly-marked adjustment line.
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeePayslipsPage() {
  const { data, isLoading, isError } = usePayslipsList();
  const payslips = data?.data ?? [];
  const [downloadingId, setDownloadingId] = useState<string | undefined>();

  async function handleDownload(ps: PayslipSummary) {
    setDownloadingId(ps.id);
    try {
      const blob = await downloadPayslipPdf(ps.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ps.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Download failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    } finally {
      setDownloadingId(undefined);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-charcoal">My Payslips</h1>
        <p className="text-xs text-slate mt-0.5">Your monthly payslip history</p>
      </div>

      {/* YTD hero */}
      <YTDHero payslips={payslips} isLoading={isLoading} />

      {isError ? (
        <div className="text-center py-12 text-crimson text-sm">
          Failed to load payslips. Please refresh.
        </div>
      ) : (
        <>
          {/* Payslip table card */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-sage/20">
              <h2 className="font-heading text-base font-semibold text-charcoal">Payslip History</h2>
            </div>
            <PayslipTable
              mode="personal"
              payslips={payslips}
              basePath="/employee/payslips"
              onDownload={handleDownload}
              downloadingId={downloadingId}
              isLoading={isLoading}
            />
            <LOPFormulaFooter payslips={payslips} />
          </div>

          {/* Info card */}
          <FinalisedInfoCard />
        </>
      )}
    </div>
  );
}
