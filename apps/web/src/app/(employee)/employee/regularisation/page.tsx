'use client';

/**
 * E-07 — Regularisation Request (Employee)
 * Visual reference: prototype/employee/regularisation.html
 *
 * Renders <RegularisationForm /> which provides:
 * - Date picker (past only)
 * - Original record panel
 * - Check-in / Check-out time inputs
 * - Reason textarea with character counter
 * - ConflictErrorBlock on 409 LEAVE_REG_CONFLICT (BL-010 / DN-19)
 * - History table below
 */

import { RegularisationForm } from '@/components/attendance/RegularisationForm';

export default function RegularisationPage() {
  return (
    <div className="p-8">
      <RegularisationForm />
    </div>
  );
}
