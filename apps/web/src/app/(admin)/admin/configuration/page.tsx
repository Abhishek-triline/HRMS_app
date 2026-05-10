'use client';

/**
 * Configuration Hub — Admin.
 * Visual reference: prototype/admin/config.html
 *
 * Tabbed single page with:
 *   Attendance | Leave Config | Tax Settings | Holidays | Leave Quotas
 *
 * Uses ?tab= query string for deep-link support.
 * Deep-link routes (/admin/config/attendance, /admin/config/leave, etc.)
 * redirect here via Next.js redirect() in their server components.
 */

import { Suspense } from 'react';
import { ConfigTabs } from '@/features/configuration/components/ConfigTabs';
import { Spinner } from '@/components/ui/Spinner';

function ConfigTabsFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" aria-label="Loading configuration" />
    </div>
  );
}

export default function ConfigurationPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-charcoal">System Configuration</h1>
        <p className="text-sm text-slate mt-1">
          Admin-only settings that govern how the HRMS behaves across all modules.
        </p>
      </div>

      <Suspense fallback={<ConfigTabsFallback />}>
        <ConfigTabs />
      </Suspense>
    </div>
  );
}
