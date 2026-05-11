'use client';

/**
 * Admin — My Profile.
 * BL-004: Admin can edit their own employee record.
 * Delegates entirely to ProfileView which renders the full self-profile.
 */

import { ProfileView } from '@/features/profile/components/ProfileView';

export default function AdminProfilePage() {
  return <ProfileView />;
}
