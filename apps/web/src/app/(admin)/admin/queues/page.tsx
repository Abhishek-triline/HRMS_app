'use client';

/**
 * Approval Queues hub — Admin.
 *
 * Consolidates the Regularisation and Leave-Encashment approval queues that
 * previously had their own sidebar entries into a single tabbed page,
 * mirroring the Configuration hub at /admin/configuration.
 *
 * Deep-link routes /admin/regularisation-queue and /admin/leave-encashment-queue
 * are intentionally NOT redirected here — notifications written before this
 * route existed point at those URLs and the detail pages under them, so we
 * keep all of those intact and just add this aggregator on top.
 */

import { Suspense } from 'react';
import { QueueTabs } from '@/features/queues/components/QueueTabs';
import { Spinner } from '@/components/ui/Spinner';
import AdminRegularisationQueuePanel from '@/app/(admin)/admin/regularisation-queue/page';
import { AdminEncashmentQueue } from '@/features/leave-encashment/components/AdminEncashmentQueue';

function QueueTabsFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" aria-label="Loading approval queues" />
    </div>
  );
}

export default function QueuesPage() {
  return (
    <Suspense fallback={<QueueTabsFallback />}>
      <QueueTabs
        regularisationPanel={<AdminRegularisationQueuePanel />}
        encashmentPanel={<AdminEncashmentQueue />}
      />
    </Suspense>
  );
}
