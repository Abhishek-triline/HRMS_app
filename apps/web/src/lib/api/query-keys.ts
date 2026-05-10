/**
 * Namespaced TanStack Query keys.
 * One canonical location — import from here, never inline keys.
 */

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
    summary: (employeeId: string, month: string) =>
      ['attendance', 'summary', employeeId, month] as const,
    overview: (date: string) => ['attendance', 'overview', date] as const,
  },

  payroll: {
    runs: ['payroll', 'runs'] as const,
    run: (id: string) => ['payroll', 'runs', id] as const,
    payslips: (employeeId: string) => ['payroll', 'payslips', employeeId] as const,
    payslip: (id: string) => ['payroll', 'payslips', 'detail', id] as const,
  },

  performance: {
    cycles: ['performance', 'cycles'] as const,
    cycle: (id: string) => ['performance', 'cycles', id] as const,
    reviews: (cycleId: string) => ['performance', 'cycles', cycleId, 'reviews'] as const,
  },

  notifications: {
    list: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
} as const;
