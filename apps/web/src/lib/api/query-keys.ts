/**
 * Namespaced TanStack Query keys.
 * One canonical location — import from here, never inline keys.
 */

import type { AttendanceListQuery } from '@nexora/contracts/attendance';
import type { RegularisationListQuery } from '@nexora/contracts/attendance';
import type { PayrollRunListQuery, PayslipListQuery } from '@nexora/contracts/payroll';
import type { CycleListQuery, ReviewListQuery } from '@nexora/contracts/performance';
import type { NotificationFilters } from './notifications';

export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },

  employees: {
    all: ['employees'] as const,
    list: (filters?: Record<string, unknown>) => ['employees', 'list', filters] as const,
    detail: (id: string) => ['employees', id] as const,
    team: (id: string) => ['employees', id, 'team'] as const,
    profile: (id: string) => ['employees', id, 'profile'] as const,
  },

  leave: {
    all: () => ['leave'] as const,
    types: () => ['leave', 'types'] as const,
    balances: (employeeId: string) => ['leave', 'balances', employeeId] as const,
    list: (q?: Partial<Record<string, unknown>>) => ['leave', 'list', q ?? {}] as const,
    detail: (id: string) => ['leave', id] as const,
    // Legacy aliases kept for any existing usage
    requests: (filters?: Record<string, unknown>) => ['leave', 'requests', filters] as const,
    request: (id: string) => ['leave', 'requests', id] as const,
  },

  attendance: {
    all: () => ['attendance'] as const,
    today: () => ['attendance', 'today'] as const,
    list: (scope: 'me' | 'team' | 'all', q?: Partial<AttendanceListQuery>) =>
      ['attendance', scope, q ?? {}] as const,
    // Legacy aliases — kept for existing references
    summary: (employeeId: string, month: string) =>
      ['attendance', 'summary', employeeId, month] as const,
    overview: (date: string) => ['attendance', 'overview', date] as const,
  },

  regularisations: {
    all: () => ['regularisations'] as const,
    list: (q?: Partial<RegularisationListQuery>) =>
      ['regularisations', 'list', q ?? {}] as const,
    detail: (id: string) => ['regularisations', id] as const,
  },

  holidays: {
    byYear: (year: number) => ['holidays', year] as const,
  },

  payroll: {
    all: () => ['payroll'] as const,
    runs: (q?: Partial<PayrollRunListQuery>) => ['payroll', 'runs', q ?? {}] as const,
    run: (id: string) => ['payroll', 'run', id] as const,
    reversals: () => ['payroll', 'reversals'] as const,
  },

  payslips: {
    all: () => ['payslips'] as const,
    list: (q?: Partial<PayslipListQuery>) => ['payslips', 'list', q ?? {}] as const,
    detail: (id: string) => ['payslips', id] as const,
  },

  taxConfig: () => ['config', 'tax'] as const,

  performance: {
    all: () => ['performance'] as const,
    cycles: (q?: Partial<CycleListQuery>) => ['performance', 'cycles', q ?? {}] as const,
    cycle: (id: string) => ['performance', 'cycle', id] as const,
    reports: {
      distribution: (cycleId: string) =>
        ['performance', 'reports', 'distribution', cycleId] as const,
      missing: (cycleId: string) =>
        ['performance', 'reports', 'missing', cycleId] as const,
    },
    reviews: (q?: Partial<ReviewListQuery>) => ['performance', 'reviews', q ?? {}] as const,
    review: (id: string) => ['performance', 'review', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (filters?: NotificationFilters) => ['notifications', 'list', filters ?? {}] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
} as const;
