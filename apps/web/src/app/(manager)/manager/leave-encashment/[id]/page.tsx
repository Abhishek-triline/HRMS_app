'use client';

import { EncashmentDetailView } from '@/features/leave-encashment/components/EncashmentDetailView';

interface Props {
  params: { id: string };
}

export default function ManagerEncashmentDetailPage({ params }: Props) {
  return <EncashmentDetailView encashmentId={Number(params.id)} backHref="/manager/leave-encashment" />;
}
