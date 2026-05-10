'use client';

/**
 * M-13 — My Payslips (Manager).
 * Manager sees their own payslips only — same layout as E-08.
 */

import { useState } from 'react';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { downloadPayslipPdf } from '@/lib/api/payroll';
import { PayslipTable } from '@/components/payroll/PayslipTable';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { PayslipSummary } from '@nexora/contracts/payroll';

export default function ManagerPayslipsPage() {
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

      {isError ? (
        <div className="text-center py-12 text-crimson text-sm">
          Failed to load payslips. Please refresh.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
          <PayslipTable
            mode="personal"
            payslips={payslips}
            basePath="/manager/payslips"
            onDownload={handleDownload}
            downloadingId={downloadingId}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
