'use client';

/**
 * useToast — lightweight hook that gives components access to the global
 * event-bus toast dispatcher without importing showToast directly.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Saved', 'Changes have been saved.');
 *   toast.error('Failed', 'Could not save changes.');
 *   toast.info('Note', 'Your session expires in 5 minutes.');
 */

import { showToast } from '@/components/ui/Toast';
import type { ToastType } from '@/components/ui/Toast';

interface ToastOptions {
  /** Duration in ms (default 5 000) */
  duration?: number;
}

function fire(type: ToastType, title: string, message?: string, options?: ToastOptions) {
  showToast({ type, title, message, duration: options?.duration });
}

export function useToast() {
  return {
    success: (title: string, message?: string, options?: ToastOptions) =>
      fire('success', title, message, options),
    error: (title: string, message?: string, options?: ToastOptions) =>
      fire('error', title, message, options),
    info: (title: string, message?: string, options?: ToastOptions) =>
      fire('info', title, message, options),
    /** Generic emit */
    show: showToast,
  } as const;
}
