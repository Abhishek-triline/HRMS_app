'use client';

/**
 * Auth hooks — TanStack Query wrappers over the auth API.
 *
 * useMe()      — GET /auth/me (staleTime 60s, retry: false for fast 401 fail)
 * useLogin()   — POST /auth/login (mutation, invalidates 'auth/me' on success)
 * useLogout()  — POST /auth/logout (mutation, clears cache on success)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { login, logout, getMe } from '@/lib/api/auth';
import { qk } from '@/lib/api/query-keys';
import { showToast } from '@/components/ui/Toast';
import type { LoginRequest } from '@nexora/contracts/auth';

const ROLE_DASHBOARD: Record<string, string> = {
  Admin: '/admin/dashboard',
  Manager: '/manager/dashboard',
  Employee: '/employee/dashboard',
  PayrollOfficer: '/payroll/dashboard',
};

// ── useMe ─────────────────────────────────────────────────────────────────────

/**
 * Returns the currently authenticated user from GET /auth/me.
 * - staleTime: 60 s so repeated renders don't re-fetch aggressively
 * - retry: false so a 401 is surfaced immediately without retries
 */
export function useMe() {
  return useQuery({
    queryKey: qk.auth.me,
    queryFn: () => getMe(),
    staleTime: 60_000,
    retry: false,
  });
}

// ── useLogin ──────────────────────────────────────────────────────────────────

/**
 * Login mutation.
 * On success: invalidates ['auth','me'], navigates to the role dashboard.
 * On error: the caller is responsible for surfacing the ApiError.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: async (response) => {
      // Invalidate the me query so the new session is reflected everywhere
      await queryClient.invalidateQueries({ queryKey: qk.auth.me });
      const destination = ROLE_DASHBOARD[response.data.role] ?? '/employee/dashboard';
      router.push(destination);
    },
  });
}

// ── useLogout ─────────────────────────────────────────────────────────────────

/**
 * Logout mutation.
 * On success (or failure — best-effort): clears all cached queries and
 * navigates to /login.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear();
      showToast({ type: 'info', title: 'Signed out successfully' });
      router.push('/login');
      router.refresh();
    },
    onError: () => {
      // Best-effort — redirect anyway
      queryClient.clear();
      router.push('/login');
      router.refresh();
    },
  });
}
