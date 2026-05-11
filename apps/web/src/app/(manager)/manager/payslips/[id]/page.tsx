'use client';

import { useParams } from 'next/navigation';
import { PayslipDetailView } from '@/features/payslips/components/PayslipDetailView';

export default function ManagerPayslipDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  return <PayslipDetailView payslipId={id} backHref="/manager/payslips" />;
}
