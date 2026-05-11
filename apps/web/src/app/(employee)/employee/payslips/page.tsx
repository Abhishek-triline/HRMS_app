'use client';

/**
 * E-08 — My Payslips (Employee).
 * Visual reference: prototype/employee/my-payslips.html
 *
 * Sections:
 *   1. Year-summary hero band (forest gradient) — 4 columns:
 *      Latest Payslip / Net (latest month) / FY Earnings / Tax YTD
 *   2. Year selector strip — "Payslip History" + FY dropdown
 *   3. 3-column grid of payslip cards
 *      - Latest card in selected FY: border-2 border-emerald + lock icon
 *      - Others: border border-sage/30
 */

import { MyPayslipsView } from '@/features/payslips/components/MyPayslipsView';

export default function EmployeePayslipsPage() {
  return <MyPayslipsView basePath="/employee/payslips" />;
}
