'use client';

import { use } from 'react';
import { EncashmentDetailView } from '@/features/leave-encashment/components/EncashmentDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EmployeeEncashmentDetailPage({ params }: Props) {
  const { id } = use(params);
  return <EncashmentDetailView encashmentId={Number(id)} backHref="/employee/leave-encashment" />;
}
