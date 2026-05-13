'use client';

/**
 * ProfileView — shared self-profile view for all four roles.
 *
 * Sections rendered:
 *   - Forest-gradient ProfileHero (all roles)
 *   - Personal card: name, email, phone, DOB, gender, PAN [v1.1 gap]
 *   - Employment card: code, role, dept, emp type, manager, joined date
 *   - Salary Structure (Admin and SELF — salary present in payload)
 *   - Quick links (Employee / Manager / Payroll — read-only roles)
 *   - Admin editable sections via AdminSelfProfileEditor
 *   - Bank Details (read-only with Contact HR hint — contract gap v1.1)
 *   - Change Password form (all roles via POST /auth/change-password — contract gap v1.1)
 *
 * Contract gaps flagged [v1.1]:
 *   - address, emergency contact: NOT in EmployeeDetail — rendered as "—" with hint
 *   - UAN/PAN/bank details: NOT in EmployeeDetail — rendered as "—" with hint
 *   - Audit log of profile edits: NOT exposed client-side — Admin only hint to audit log
 *   - Change Password endpoint: NOT confirmed in contracts/auth.ts — form rendered as stub
 *
 * The admin prototype wraps all editable personal + job + salary fields in forms.
 * Non-admin roles: all read-only, with "Contact HR to update" info notice.
 */

import { useProfile } from '@/lib/hooks/useEmployees';
import { useMe } from '@/lib/hooks/useAuth';
import { ProfileHero } from '@/components/employees/ProfileHero';
import { AdminSelfProfileEditor } from './AdminSelfProfileEditor';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';
import { ROLE_ID, ROLE_MAP, GENDER_MAP, EMPLOYMENT_TYPE_MAP } from '@/lib/status/maps';
import Link from 'next/link';

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmtInr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function formatRupees(paise: number) {
  return `₹${fmtInr.format(Math.floor(paise / 100))}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatGender(gId: number | null | undefined): string {
  if (gId == null) return '—';
  return GENDER_MAP[gId]?.label ?? String(gId);
}

// ── Read-only field row ───────────────────────────────────────────────────────

function DlRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate">{label}</dt>
      <dd className={`text-charcoal font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
      <h3 className="font-heading text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
        {icon}
        {title}
        {badge}
      </h3>
      {children}
    </div>
  );
}

// ── Quick links (Employee / Manager / Payroll) ────────────────────────────────

function QuickLinksCard({ roleId }: { roleId: number }) {
  // Role-specific link targets
  const basePath =
    roleId === ROLE_ID.Manager
      ? '/manager'
      : roleId === ROLE_ID.PayrollOfficer
        ? '/payroll'
        : '/employee';

  const links = [
    { label: 'My Leave', href: `${basePath}/my-leave` },
    { label: 'My Attendance', href: `${basePath}/my-attendance` },
    { label: 'My Payslips', href: `${basePath}/my-payslips` },
    { label: 'My Review', href: `${basePath}/my-review` },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
      <h3 className="font-heading text-sm font-bold text-charcoal mb-4">Quick links</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-center gap-1 bg-softmint border border-mint hover:border-forest text-forest text-xs font-semibold rounded-lg px-3 py-2.5 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-slate flex items-start gap-2">
        <svg
          className="w-3.5 h-3.5 text-umber mt-0.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Profile details are read-only. To update, contact your HR Administrator.
      </p>
    </div>
  );
}

// ── Salary section (read-only, used by non-admin SELF) ───────────────────────

function SalarySection({
  basic_paise,
  allowances_paise,
  hra_paise,
  other_paise,
  effectiveFrom,
}: {
  basic_paise: number;
  allowances_paise: number;
  hra_paise?: number | null;
  other_paise?: number | null;
  effectiveFrom: string;
}) {
  const gross = basic_paise + allowances_paise;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-5">
      <h3 className="font-heading text-sm font-bold text-charcoal mb-4">Salary Structure</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-offwhite rounded-lg px-3.5 py-3">
          <div className="text-xs text-slate mb-0.5">Basic Salary</div>
          <div className="text-sm font-bold text-charcoal">{formatRupees(basic_paise)}</div>
        </div>
        {hra_paise != null ? (
          <div className="bg-offwhite rounded-lg px-3.5 py-3">
            <div className="text-xs text-slate mb-0.5">HRA</div>
            <div className="text-sm font-bold text-charcoal">{formatRupees(hra_paise)}</div>
          </div>
        ) : (
          <div className="bg-offwhite rounded-lg px-3.5 py-3">
            <div className="text-xs text-slate mb-0.5">Allowances</div>
            <div className="text-sm font-bold text-charcoal">{formatRupees(allowances_paise)}</div>
          </div>
        )}
        {other_paise != null && (
          <div className="bg-offwhite rounded-lg px-3.5 py-3">
            <div className="text-xs text-slate mb-0.5">Other Allowances</div>
            <div className="text-sm font-bold text-charcoal">{formatRupees(other_paise)}</div>
          </div>
        )}
      </div>
      <div className="bg-forest rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-mint/80 text-xs font-medium">Gross Monthly CTC</span>
        <span className="font-heading text-white text-lg font-bold">{formatRupees(gross)}</span>
      </div>
      <p className="text-xs text-slate mt-2">Effective from: {formatDate(effectiveFrom)}</p>
    </div>
  );
}

// ── Profile Audit log stub (Admin-only, v1.1) ────────────────────────────────

function ProfileAuditCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-semibold text-charcoal">Recent Profile Edits</h3>
        <Link href="/admin/audit-log" className="text-xs text-emerald font-semibold hover:underline">
          View Audit Log
        </Link>
      </div>
      <p className="text-xs text-slate leading-relaxed">
        All profile edits are written to the system audit log. View the full log
        for a record of every change made to your profile.
      </p>
      <p className="text-[10px] text-slate mt-2 italic">
        Filtered profile-edit audit view — coming in v1.1.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ProfileViewProps {
  /** Override the employee ID — defaults to the authenticated user's ID */
  employeeId?: number;
}

export function ProfileView({ employeeId: propEmployeeId }: ProfileViewProps = {}) {
  const { data: meData, isLoading: meLoading } = useMe();
  const meUser = meData?.data?.user;
  const employeeId: number = propEmployeeId ?? meUser?.id ?? 0;
  const roleId: number = meUser?.roleId ?? 0;

  const {
    data: profile,
    isLoading: profileLoading,
    isError,
    error,
    refetch,
  } = useProfile(employeeId);

  const isLoading = meLoading || (Boolean(employeeId) && profileLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !profile) {
    const apiErr = error as ApiError | null;
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-6 py-8 text-center">
        <p className="text-crimson font-semibold">
          {apiErr?.status === 404
            ? 'Profile not found.'
            : 'Failed to load your profile. Please refresh the page.'}
        </p>
      </div>
    );
  }

  const salary = profile.salaryStructure;
  const isAdmin = roleId === ROLE_ID.Admin;
  const profileRoleLabel = ROLE_MAP[profile.roleId]?.label ?? String(profile.roleId);

  // ── Admin layout: 2/3 + 1/3 column layout matching prototype ─────────────
  if (isAdmin) {
    return (
      <div className="space-y-5">
        <ProfileHero
          name={profile.name}
          empCode={profile.code}
          designation={profile.designation}
          department={profile.department}
          status={profile.status}
          role={profileRoleLabel}
          joinDate={profile.joinDate}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: editable forms (2/3) */}
          <div className="lg:col-span-2 space-y-5">
            <AdminSelfProfileEditor
              employee={profile}
              onSuccess={() => { void refetch(); }}
            />
          </div>

          {/* Right: side cards (1/3) */}
          <div className="space-y-5">
            <ProfileAuditCard />
          </div>
        </div>
      </div>
    );
  }

  // ── Non-admin layout: read-only, matching employee/manager/payroll prototypes ─

  return (
    <div className="space-y-5">
      <ProfileHero
        name={profile.name}
        empCode={profile.code}
        designation={profile.designation}
        department={profile.department}
        status={profile.status}
        role={profileRoleLabel}
        joinDate={profile.joinDate}
      />

      {/* Personal + Employment cards — 2-col grid per prototype */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal card */}
        <SectionCard
          title="Personal"
          icon={
            <svg
              className="w-4 h-4 text-forest"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        >
          <dl className="space-y-3 text-sm">
            <DlRow label="Full name" value={profile.name} />
            <DlRow label="Email" value={profile.email} />
            <DlRow label="Phone" value={profile.phone ?? '—'} />
            {profile.dateOfBirth && (
              <DlRow label="Date of birth" value={formatDate(profile.dateOfBirth)} />
            )}
            {profile.genderId && (
              <DlRow label="Gender" value={formatGender(profile.genderId)} />
            )}
            {/* PAN — contract gap v1.1 */}
            <div className="flex justify-between gap-4">
              <dt className="text-slate">PAN</dt>
              <dd className="text-slate italic text-xs">— v1.1</dd>
            </div>
          </dl>
        </SectionCard>

        {/* Employment card */}
        <SectionCard
          title="Employment"
          icon={
            <svg
              className="w-4 h-4 text-forest"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Employee code</dt>
              <dd className="text-forest font-mono font-semibold">{profile.code}</dd>
            </div>
            <DlRow label="Role" value={profileRoleLabel} />
            <DlRow label="Department" value={profile.department ?? '—'} />
            <DlRow label="Designation" value={profile.designation ?? '—'} />
            <DlRow label="Employment type" value={EMPLOYMENT_TYPE_MAP[profile.employmentTypeId]?.label ?? String(profile.employmentTypeId)} />
            <DlRow label="Reporting manager" value={profile.reportingManagerName ?? '—'} />
            <DlRow label="Date joined" value={formatDate(profile.joinDate)} />
          </dl>
        </SectionCard>
      </div>

      {/* Salary section (when present — SELF always gets salary in payload) */}
      {salary && (
        <SalarySection
          basic_paise={salary.basic_paise}
          allowances_paise={salary.allowances_paise}
          hra_paise={salary.hra_paise}
          other_paise={salary.other_paise}
          effectiveFrom={salary.effectiveFrom}
        />
      )}

      {/* Quick links */}
      <QuickLinksCard roleId={roleId} />
    </div>
  );
}
