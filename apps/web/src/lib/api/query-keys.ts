/**
 * Namespaced TanStack Query keys.
 * One canonical location — import from here, never inline keys.
 */

import type { AttendanceListQuery } from '@nexora/contracts/attendance';
import type { RegularisationListQuery } from '@nexora/contracts/attendance';
import type { PayrollRunListQuery, PayslipListQuery } from '@nexora/contracts/payroll';
import type { CycleListQuery, ReviewListQuery } from '@nexora/contracts/performance';
import type { NotificationFilters } from './notifications';
import type { AuditLogFilters } from './audit';
import type { LeaveEncashmentListQuery } from '@nexora/contracts/leave-encashment';

export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },

  employees: {
    all: ['employees'] as const,
    list: (filters?: Record<string, unknown>) => ['employees', 'list', filters] as const,
    detail: (id: number) => ['employees', id] as const,
    team: (id: number) => ['employees', id, 'team'] as const,
    profile: (id: number) => ['employees', id, 'profile'] as const,
  },

  leave: {
    all: () => ['leave'] as const,
    types: () => ['leave', 'types'] as const,
    balances: (employeeId: number) => ['leave', 'balances', employeeId] as const,
    list: (q?: Partial<Record<string, unknown>>) => ['leave', 'list', q ?? {}] as const,
    detail: (idOrCode: number | string) => ['leave', idOrCode] as const,
    // Legacy aliases kept for any existing usage
    requests: (filters?: Record<string, unknown>) => ['leave', 'requests', filters] as const,
    request: (id: number) => ['leave', 'requests', id] as const,
  },

  attendance: {
    all: () => ['attendance'] as const,
    today: () => ['attendance', 'today'] as const,
    list: (scope: 'me' | 'team' | 'all', q?: Partial<AttendanceListQuery>) =>
      ['attendance', scope, q ?? {}] as const,
    stats: (q?: Record<string, unknown>) => ['attendance', 'stats', q ?? {}] as const,
    // Legacy aliases — kept for existing references
    summary: (employeeId: string, month: string) =>
      ['attendance', 'summary', employeeId, month] as const,
    overview: (date: string) => ['attendance', 'overview', date] as const,
  },

  regularisations: {
    all: () => ['regularisations'] as const,
    list: (q?: Partial<RegularisationListQuery>) =>
      ['regularisations', 'list', q ?? {}] as const,
    detail: (id: number) => ['regularisations', id] as const,
  },

  holidays: {
    byYear: (year: number) => ['holidays', year] as const,
  },

  payroll: {
    all: () => ['payroll'] as const,
    runs: (q?: Partial<PayrollRunListQuery>) => ['payroll', 'runs', q ?? {}] as const,
    run: (id: number) => ['payroll', 'run', id] as const,
    reversals: () => ['payroll', 'reversals'] as const,
  },

  payslips: {
    all: () => ['payslips'] as const,
    list: (q?: Partial<PayslipListQuery>) => ['payslips', 'list', q ?? {}] as const,
    detail: (id: number) => ['payslips', id] as const,
  },

  taxConfig: () => ['config', 'tax'] as const,

  performance: {
    all: () => ['performance'] as const,
    cycles: (q?: Partial<CycleListQuery>) => ['performance', 'cycles', q ?? {}] as const,
    cycle: (id: number) => ['performance', 'cycle', id] as const,
    reports: {
      distribution: (cycleId: number) =>
        ['performance', 'reports', 'distribution', cycleId] as const,
      missing: (cycleId: number) =>
        ['performance', 'reports', 'missing', cycleId] as const,
    },
    reviews: (q?: Partial<ReviewListQuery>) => ['performance', 'reviews', q ?? {}] as const,
    review: (id: number) => ['performance', 'review', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (filters?: NotificationFilters) => ['notifications', 'list', filters ?? {}] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },

  audit: {
    all: ['audit'] as const,
    list: (filters?: AuditLogFilters) => ['audit', 'list', filters ?? {}] as const,
  },

  config: {
    attendance: () => ['config', 'attendance'] as const,
    leave: () => ['config', 'leave'] as const,
    encashment: () => ['config', 'encashment'] as const,
  },

  encashment: {
    all: () => ['encashment'] as const,
    list: (q?: Partial<LeaveEncashmentListQuery>) => ['encashment', 'list', q ?? {}] as const,
    detail: (id: number) => ['encashment', id] as const,
    queue: () => ['encashment', 'queue'] as const,
  },

  masters: {
    all: ['masters'] as const,
    roles: () => ['masters', 'roles'] as const,
    departments: () => ['masters', 'departments'] as const,
    designations: () => ['masters', 'designations'] as const,
    employmentTypes: () => ['masters', 'employment-types'] as const,
    genders: () => ['masters', 'genders'] as const,
  },
} as const;
