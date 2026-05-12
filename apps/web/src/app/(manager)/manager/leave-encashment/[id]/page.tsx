'use client';

import { use } from 'react';
import { EncashmentDetailView } from '@/features/leave-encashment/components/EncashmentDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ManagerEncashmentDetailPage({ params }: Props) {
  const { id } = use(params);
  return <EncashmentDetailView encashmentId={id} backHref="/manager/leave-encashment" />;
}
