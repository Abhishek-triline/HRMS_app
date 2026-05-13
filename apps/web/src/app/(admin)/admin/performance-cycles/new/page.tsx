'use client';

/**
 * A-20 — Create Performance Cycle (Admin).
 * Visual reference: prototype/admin/performance-cycles.html (create form state)
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateCycle } from '@/lib/hooks/usePerformance';
import { useMe } from '@/lib/hooks/useAuth';
import { CycleCreateForm } from '@/components/performance/CycleCreateForm';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import type { CreateCycleRequest } from '@nexora/contracts/performance';

export default function NewPerformanceCyclePage() {
  const router = useRouter();
  const { data: auth } = useMe();
  const { mutateAsync, isPending } = useCreateCycle();

  async function handleSubmit(data: CreateCycleRequest) {
    try {
      const result = await mutateAsync(data);
      const skippedCount = result.skipped.length;
      showToast({
        type: 'success',
        title: `Cycle ${result.cycle.code} created`,
        message: `${result.reviewCount} reviews created.${skippedCount > 0 ? ` ${skippedCount} mid-cycle joiner(s) skipped.` : ''}`,
      });
      router.push(`/admin/performance-cycles/${result.cycle.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        showToast({
          type: 'error',
          title: 'Failed to create cycle',
          message: err.message,
        });
      }
    }
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate mb-5" aria-label="Breadcrumb">
        <Link href="/admin/performance-cycles" className="hover:text-forest transition-colors">
          Performance Cycles
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">New Cycle</span>
      </nav>

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">Create Performance Cycle</h1>
        <p className="text-sm text-slate mt-1">
          Set up a new half-yearly review cycle. Assign peer reviewers for Admin employees (Option B).
        </p>
      </div>

      <CycleCreateForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        currentUserId={auth?.data?.user?.id}
      />
    </>
  );
}
