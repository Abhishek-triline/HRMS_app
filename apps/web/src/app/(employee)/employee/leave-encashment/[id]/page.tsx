'use client';

import { EncashmentDetailView } from '@/features/leave-encashment/components/EncashmentDetailView';

interface Props {
  params: { id: string };
}

export default function EmployeeEncashmentDetailPage({ params }: Props) {
  return <EncashmentDetailView encashmentId={Number(params.id)} backHref="/employee/leave-encashment" />;
}
