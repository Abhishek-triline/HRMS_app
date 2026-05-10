'use client';

/**
 * MarkAllReadButton — calls POST /notifications/mark-read with { all: true }.
 *
 * Optimistic: fires immediately, rolls back on error with a toast.
 * Shows spinner while in-flight.
 */

import { useMarkRead } from '../hooks/useMarkRead';
import { useToast } from '@/lib/hooks/useToast';

interface MarkAllReadButtonProps {
  /** Disabled when there are no unread notifications. */
  disabled?: boolean;
}

export function MarkAllReadButton({ disabled = false }: MarkAllReadButtonProps) {
  const markRead = useMarkRead();
  const toast = useToast();

  function handleClick() {
    markRead.mutate(
      { all: true },
      {
        onSuccess: () => {
          toast.success('All caught up', 'All notifications marked as read.');
        },
        onError: () => {
          toast.error('Could not mark all as read', 'Please try again.');
        },
      },
    );
  }

  const isLoading = markRead.isPending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="text-xs font-semibold text-emerald hover:underline disabled:opacity-40 disabled:cursor-not-allowed transition-opacity focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none rounded"
      aria-label="Mark all notifications as read"
    >
      {isLoading ? 'Marking…' : 'Mark all as read'}
    </button>
  );
}
