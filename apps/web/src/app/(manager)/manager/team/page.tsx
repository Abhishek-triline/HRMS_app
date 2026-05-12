'use client';

/**
 * M-02 — My Team (Manager).
 * Visual reference: prototype/manager/my-team.html
 *
 * Two tabs: "Current Team" + "Past Team Members" (BL-022a).
 * Calls useTeam(me.id) — current + past arrays from API.
 * Past tab carries pastEndedAt timestamp + pastReason badge.
 * Click-through to read-only profile (history stays visible BL-022a).
 */

import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useMe } from '@/lib/hooks/useAuth';
import { useTeam } from '@/lib/hooks/useEmployees';
import { EmployeeStatusBadge } from '@/components/employees/EmployeeStatusBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import type { TeamMember } from '@nexora/contracts/employees';
import { EMPLOYEE_STATUS, EMPLOYMENT_TYPE_MAP } from '@/lib/status/maps';

type Tab = 'current' | 'past';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function formatDate(iso: string | null | undefined) {
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

function CurrentMemberCard({ member }: { member: TeamMember }) {
  const initials = getInitials(member.name);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-semibold text-charcoal">{member.name}</div>
          <div className="text-xs text-slate mt-0.5 font-mono">{member.code}</div>
          <div className="text-sm text-slate mt-1">{member.designation ?? '—'}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="bg-softmint text-forest text-xs font-bold px-2 py-1 rounded">
          {EMPLOYMENT_TYPE_MAP[member.employmentTypeId]?.label ?? String(member.employmentTypeId)}
        </span>
        <EmployeeStatusBadge status={member.status} />
        {!member.isDirect && (
          <span className="bg-lockedbg text-lockedfg text-xs font-bold px-2 py-1 rounded">
            Indirect
          </span>
        )}
      </div>
      <div className="text-xs text-slate mb-1">
        Joined: <span className="text-charcoal font-medium">{formatDate(member.joinDate)}</span>
      </div>
      <div className="mt-4 pt-4 border-t border-sage/20 flex gap-4">
        <Link
          href={`/manager/team/${member.id}`}
          className="text-xs font-semibold text-emerald hover:underline"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}

function PastMemberCard({ member }: { member: TeamMember }) {
  const initials = getInitials(member.name);
  return (
    <div className="bg-white rounded-xl border border-sage/30 p-6 opacity-90">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-lockedbg text-lockedfg flex items-center justify-center text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-semibold text-charcoal">{member.name}</div>
          <div className="text-xs text-slate mt-0.5 font-mono">{member.code}</div>
          <div className="text-sm text-slate mt-1">{member.designation ?? '—'}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="bg-softmint text-forest text-xs font-bold px-2 py-1 rounded">
          {EMPLOYMENT_TYPE_MAP[member.employmentTypeId]?.label ?? String(member.employmentTypeId)}
        </span>
        {member.pastReasonId === 2 && (
          <StatusBadge status="on-notice" label="Reassigned" />
        )}
        {member.pastReasonId === 3 && (
          <StatusBadge status="exited" label="Exited" />
        )}
      </div>
      {member.pastEndedAt && (
        <div className="text-xs text-slate mb-1">
          Left team: <span className="text-charcoal font-medium">{formatDate(member.pastEndedAt)}</span>
        </div>
      )}
      <div className="text-xs text-slate mb-1">
        Joined: <span className="text-charcoal font-medium">{formatDate(member.joinDate)}</span>
      </div>
      <div className="mt-4 pt-4 border-t border-sage/20 flex gap-4">
        <Link
          href={`/manager/team/${member.id}`}
          className="text-xs font-semibold text-emerald hover:underline"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}

export default function MyTeamPage() {
  const [activeTab, setActiveTab] = useState<Tab>('current');

  const { data: meData } = useMe();
  const myId = meData?.data?.user?.id ?? 0;

  const { data: teamData, isLoading, isError, refetch } = useTeam(myId);
  const current = teamData?.current ?? [];
  const past = teamData?.past ?? [];

  const activeCount = current.filter((m) => m.status === EMPLOYEE_STATUS.Active).length;
  const onLeaveCount = current.filter((m) => m.status === EMPLOYEE_STATUS.OnLeave).length;
  const onNoticeCount = current.filter((m) => m.status === EMPLOYEE_STATUS.OnNotice).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 flex items-center justify-between">
        <p className="text-sm text-crimson">Failed to load team data.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-semibold text-crimson border border-crimson/40 rounded-lg px-3 py-1.5 hover:bg-crimson hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-heading font-bold text-2xl text-charcoal">My Team</h2>
          <p className="text-sm text-slate mt-1">
            Your direct and indirect reports
          </p>
        </div>
        <div className="flex gap-3">
          {activeCount > 0 && (
            <span className="bg-greenbg text-richgreen text-xs font-bold px-3 py-1.5 rounded">
              {activeCount} Active
            </span>
          )}
          {onLeaveCount > 0 && (
            <span className="bg-umberbg text-umber text-xs font-bold px-3 py-1.5 rounded">
              {onLeaveCount} On Leave
            </span>
          )}
          {onNoticeCount > 0 && (
            <span className="bg-umberbg text-umber text-xs font-bold px-3 py-1.5 rounded">
              {onNoticeCount} On Notice
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-sage/30">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={clsx(
            'px-4 py-2.5 text-sm font-semibold transition-colors -mb-px',
            activeTab === 'current'
              ? 'text-forest border-b-2 border-forest'
              : 'text-slate hover:text-charcoal',
          )}
          aria-selected={activeTab === 'current'}
          role="tab"
        >
          Current Team{' '}
          <span
            className={clsx(
              'ml-1.5 text-xs px-1.5 py-0.5 rounded font-bold',
              activeTab === 'current'
                ? 'bg-forest text-white'
                : 'bg-lockedbg text-lockedfg',
            )}
          >
            {current.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={clsx(
            'px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
            activeTab === 'past'
              ? 'text-forest font-semibold border-b-2 border-forest'
              : 'text-slate hover:text-charcoal',
          )}
          aria-selected={activeTab === 'past'}
          role="tab"
        >
          Past Team Members{' '}
          <span className="ml-1.5 bg-lockedbg text-lockedfg text-xs px-1.5 py-0.5 rounded font-bold">
            {past.length}
          </span>
        </button>
      </div>

      {/* Current Team Tab */}
      {activeTab === 'current' && (
        <div>
          {current.length === 0 ? (
            <div className="bg-white rounded-xl border border-sage/30 py-16 text-center">
              <svg className="w-10 h-10 text-sage mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-slate">No direct or indirect reports yet.</p>
              <p className="text-xs text-sage mt-1">Contact Admin to assign employees to your team.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {current.map((member) => (
                <CurrentMemberCard key={member.id} member={member} />
              ))}
            </div>
          )}

          {/* Hierarchy note */}
          <div className="bg-softmint border border-mint rounded-xl p-5 flex gap-3 mt-4">
            <svg className="w-5 h-5 text-forest shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-forest mb-1">Team hierarchy</p>
              <p className="text-xs text-slate leading-relaxed">
                <span className="font-semibold text-charcoal">Direct</span> reports are immediately below you.{' '}
                <span className="font-semibold text-charcoal">Indirect</span> members are in your extended subtree. Leave and regularisation approvals route only from your direct reports.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Past Team Tab */}
      {activeTab === 'past' && (
        <div>
          <p className="text-xs text-slate mb-4">
            Employees who previously reported to you. Read-only — historical record retained for audit (BL-007 / BL-042).
          </p>

          {past.length === 0 ? (
            <div className="bg-white rounded-xl border border-sage/30 py-16 text-center">
              <p className="text-sm text-slate">No past team members on record.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {past.map((member) => (
                <PastMemberCard key={member.id} member={member} />
              ))}
            </div>
          )}

          {/* Audit note */}
          <div className="bg-offwhite border border-sage/30 rounded-xl p-5 flex gap-3 mt-4">
            <svg className="w-5 h-5 text-slate shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-charcoal mb-1">Read-only history</p>
              <p className="text-sm text-slate leading-relaxed">
                You cannot approve or reject leave or attendance for past members. Those rights moved with the reporting line. Records remain visible for audit (BL-007). Pending requests submitted before a reassignment remain with you to action (BL-022).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
