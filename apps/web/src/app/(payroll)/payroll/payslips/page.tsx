'use client';

/**
 * PayrollOfficer — My Payslips (personal).
 * Mirrors E-08 / M-13 but routed under /payroll/payslips.
 */

import { useState } from 'react';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { downloadPayslipPdf } from '@/lib/api/payroll';
import { PayslipTable } from '@/components/payroll/PayslipTable';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { PayslipSummary } from '@nexora/contracts/payroll';

export default function POMyPayslipsPage() {
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
      showToast({ type: 'error', title: 'Download failed', message: err instanceof ApiError ? err.message : 'Please try again.' });
    } finally {
      setDownloadingId(undefined);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-charcoal">My Payslips</h1>
        <p className="text-xs text-slate mt-0.5">Your personal payslip history</p>
      </div>
      {isError ? (
        <div className="text-center py-12 text-crimson text-sm">Failed to load payslips.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
          <PayslipTable
            mode="personal"
            payslips={payslips}
            basePath="/payroll/payslips"
            onDownload={handleDownload}
            downloadingId={downloadingId}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
