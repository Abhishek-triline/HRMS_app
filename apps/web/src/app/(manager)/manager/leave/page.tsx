'use client';

import { Spinner } from '@/components/ui/Spinner';
import { MyLeaveShell } from '@/components/leave/MyLeaveShell';
import { useMe } from '@/lib/hooks/useAuth';

export default function ManagerMyLeavePage() {
  const { data: me, isLoading } = useMe();
  const employeeId = me?.data?.user?.id ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <MyLeaveShell
      employeeId={employeeId}
      basePath="/manager/leave"
      pageTitle="My Leave"
    />
  );
}
