'use client';

/**
 * Approval Queues hub — Manager.
 *
 * Mirrors /admin/queues but scoped to the manager's reportees. Standalone
 * routes /manager/regularisation-queue and /manager/leave-encashment-queue
 * stay live for notification deep-links; this aggregator is just the new
 * primary sidebar entry.
 */

import { Suspense } from 'react';
import { QueueTabs } from '@/features/queues/components/QueueTabs';
import { Spinner } from '@/components/ui/Spinner';
import ManagerRegularisationQueuePanel from '@/app/(manager)/manager/regularisation-queue/page';
import { ManagerEncashmentQueue } from '@/features/leave-encashment/components/ManagerEncashmentQueue';

function QueueTabsFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" aria-label="Loading approval queues" />
    </div>
  );
}

export default function ManagerQueuesPage() {
  return (
    <Suspense fallback={<QueueTabsFallback />}>
      <QueueTabs
        regularisationPanel={<ManagerRegularisationQueuePanel />}
        encashmentPanel={<ManagerEncashmentQueue />}
      />
    </Suspense>
  );
}
