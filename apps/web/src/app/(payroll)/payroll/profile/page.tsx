'use client';

/**
 * Payroll Officer — My Profile (read-only self-service view).
 * Salary section visible because the viewer is SELF.
 */

import { useMe } from '@/lib/hooks/useAuth';
import { ProfileView } from '@/components/employees/ProfileView';
import { Spinner } from '@/components/ui/Spinner';

export default function PayrollProfilePage() {
  const { data: meData, isLoading } = useMe();
  const myId = meData?.data?.user?.id;

  if (isLoading || !myId) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-charcoal mb-5">My Profile</h2>
      <ProfileView employeeId={myId} showSalary />
    </div>
  );
}
