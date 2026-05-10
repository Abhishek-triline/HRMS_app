'use client';

/**
 * useMarkRead — mutation hook for marking notifications as read.
 *
 * Accepts { ids: string[] } or { all: true }.
 * On success: invalidates both feed and unread-count query keys.
 * On error: rollback is implicit (optimistic update applied at call site).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationsRead } from '@/lib/api/notifications';
import { qk } from '@/lib/api/query-keys';
import { useToast } from '@/lib/hooks/useToast';
import type { MarkReadRequest } from '@nexora/contracts/notifications';

export function useMarkRead() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (body: MarkReadRequest) => markNotificationsRead(body),
    onSuccess: (data) => {
      // Invalidate the entire notification feed and the unread-count bell
      queryClient.invalidateQueries({ queryKey: qk.notifications.all });
      queryClient.invalidateQueries({ queryKey: qk.notifications.unreadCount() });

      const updated = data.data.updated;
      if (updated > 0) {
        // Silently refresh — toast only on "Mark all" (handled by MarkAllReadButton)
      }
    },
    onError: () => {
      toast.error('Could not mark as read', 'Please try again.');
    },
  });
}
