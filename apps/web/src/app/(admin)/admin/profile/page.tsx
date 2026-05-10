'use client';

/**
 * Admin — My Profile (editable self-service view).
 *
 * BL-004: Admin role is permitted to edit their own employee record.
 * Uses AdminSelfProfileEditor which calls PATCH /api/v1/employees/{id}
 * and emits an `employee.profile.self-update` audit row (BL-047).
 *
 * Shows the forest-gradient ProfileHero followed by the editable form.
 */

import { useMe } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useEmployees';
import { ProfileHero } from '@/components/employees/ProfileHero';
import { AdminSelfProfileEditor } from '@/features/profile/components/AdminSelfProfileEditor';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminProfilePage() {
  const { data: meData, isLoading: meLoading } = useMe();
  const myId = meData?.data?.user?.id;

  const {
    data: profile,
    isLoading: profileLoading,
    isError,
    refetch,
  } = useProfile(myId ?? '');

  const isLoading = meLoading || (Boolean(myId) && profileLoading);

  if (isLoading || !myId) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-6 py-8 text-center">
        <p className="text-crimson font-semibold">
          Failed to load your profile. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-charcoal mb-5">My Profile</h2>

      {/* Forest-gradient hero — same design as all other role profiles */}
      <ProfileHero
        name={profile.name}
        empCode={profile.code}
        designation={profile.designation}
        department={profile.department}
        status={profile.status}
        role={profile.role}
        joinDate={profile.joinDate}
      />

      {/* BL-004 self-edit form */}
      <AdminSelfProfileEditor
        employee={profile}
        onSuccess={() => {
          // Refetch the profile to sync the hero card with the saved values
          void refetch();
        }}
      />
    </div>
  );
}
