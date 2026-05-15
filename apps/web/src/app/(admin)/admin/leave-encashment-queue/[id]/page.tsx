'use client';

/**
 * Admin queue-scoped encashment detail.
 *
 * Renders the same EncashmentDetailView as /admin/leave-encashment/[id],
 * but lives under the leave-encashment-queue namespace so the sidebar
 * stays highlighted on "Queues" instead of switching to "My Encashment"
 * when the admin drills into a row from /admin/queues.
 */

import { EncashmentDetailView } from '@/features/leave-encashment/components/EncashmentDetailView';

interface Props {
  params: { id: string };
}

export default function AdminEncashmentQueueDetailPage({ params }: Props) {
  return (
    <EncashmentDetailView
      encashmentId={Number(params.id)}
      backHref="/admin/queues?tab=encashment&subtab=all"
    />
  );
}
