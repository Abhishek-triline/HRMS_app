'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api/auth';
import { showToast } from '@/components/ui/Toast';

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        await logout();
      } catch {
        // Best-effort — even if the API call fails, redirect to login
      }
      showToast({ type: 'info', title: 'Signed out successfully' });
      router.push('/login');
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      aria-label="Sign out of Nexora HRMS"
      className={className}
    >
      {children}
    </button>
  );
}
