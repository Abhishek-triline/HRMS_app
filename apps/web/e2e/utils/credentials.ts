/**
 * Seeded demo credentials (apps/api/prisma/seed.ts).
 *
 * All four accounts share the same password by design — the seed sets
 * COMMON_PASSWORD = ADMIN_PASSWORD for demo simplicity. Never hard-code
 * passwords in production deployments.
 */

export const CREDS = {
  admin: {
    email: 'admin@triline.co.in',
    password: 'admin@123',
    name: 'Priya Sharma',
    code: 'EMP-2024-0001',
    dashboardPath: '/admin/dashboard',
  },
  manager: {
    email: 'manager@triline.co.in',
    password: 'admin@123',
    name: 'Arjun Mehta',
    code: 'EMP-2024-0002',
    dashboardPath: '/manager/dashboard',
  },
  employee: {
    email: 'employee@triline.co.in',
    password: 'admin@123',
    name: 'Kavya Reddy',
    code: 'EMP-2024-0003',
    dashboardPath: '/employee/dashboard',
  },
  payroll: {
    email: 'payroll@triline.co.in',
    password: 'admin@123',
    name: 'Ravi Iyer',
    code: 'EMP-2024-0004',
    dashboardPath: '/payroll/dashboard',
  },
} as const;

export type Role = keyof typeof CREDS;
