'use client';

/**
 * DownloadsCard — three download actions in the employee detail sidebar.
 *
 * 1. Latest Payslip — queries GET /payslips?employeeId=<id>&limit=1, then
 *    triggers POST /payslips/<latestId>/pdf (via useDownloadPayslipPdf).
 * 2. Form 16 — disabled with tooltip "Available after FY close".
 * 3. Employment Letter — disabled with tooltip "Coming soon".
 *
 * Contract gap: Employment Letter endpoint not yet defined. Form 16 requires
 * a separate endpoint that is not in the current contract.
 */

import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { useDownloadPayslipPdf } from '@/lib/hooks/usePayslips';
import { showToast } from '@/components/ui/Toast';

const DownloadIcon = () => (
  <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

interface Props {
  employeeId: number;
}

export function DownloadsCard({ employeeId }: Props) {
  const { data: payslipsData, isLoading: payslipsLoading } = usePayslipsList({
    employeeId,
    limit: 1,
  });

  const latestPayslip = payslipsData?.data?.[0] ?? null;

  const downloadPdf = useDownloadPayslipPdf(latestPayslip?.code ?? '');

  function handlePayslipDownload() {
    if (!latestPayslip) {
      showToast({ type: 'info', title: 'No payslips', message: 'No payslips found for this employee.' });
      return;
    }
    downloadPdf.mutate(latestPayslip.id, {
      onError: () => {
        showToast({ type: 'error', title: 'Download failed', message: 'Could not download payslip PDF.' });
      },
    });
  }

  const latestLabel = latestPayslip
    ? `Latest Payslip (${latestPayslip.code})`
    : payslipsLoading
      ? 'Loading payslip…'
      : 'Latest Payslip';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-4 py-4">
      <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
        Downloads
      </h3>
      <div className="space-y-2">
        {/* Latest Payslip */}
        <button
          type="button"
          onClick={handlePayslipDownload}
          disabled={!latestPayslip || downloadPdf.isPending}
          className="w-full flex items-center gap-2 text-xs text-slate hover:text-forest px-2 py-1.5 rounded hover:bg-offwhite transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DownloadIcon />
          {downloadPdf.isPending ? 'Downloading…' : latestLabel}
        </button>

        {/* Form 16 — disabled */}
        <div className="relative group">
          <button
            type="button"
            disabled
            className="w-full flex items-center gap-2 text-xs text-slate/50 px-2 py-1.5 rounded cursor-not-allowed"
            aria-describedby="form16-tooltip"
          >
            <DownloadIcon />
            Form 16 (FY {new Date().getFullYear() - 1}–{String(new Date().getFullYear()).slice(2)})
          </button>
          <div
            id="form16-tooltip"
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-charcoal text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10"
          >
            Available after FY close
          </div>
        </div>

        {/* Employment Letter — disabled */}
        <div className="relative group">
          <button
            type="button"
            disabled
            className="w-full flex items-center gap-2 text-xs text-slate/50 px-2 py-1.5 rounded cursor-not-allowed"
            aria-describedby="emp-letter-tooltip"
          >
            <DownloadIcon />
            Employment Letter
          </button>
          <div
            id="emp-letter-tooltip"
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-charcoal text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10"
          >
            Coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
