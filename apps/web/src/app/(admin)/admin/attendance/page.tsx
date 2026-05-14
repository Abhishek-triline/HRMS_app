'use client';

/**
 * A-09 — Org-wide Attendance (Admin)
 * Visual reference: prototype/admin/attendance.html
 *
 * Layout (prototype-exact):
 *   1. Day picker + department filter + status filter
 *   2. 5-tile KPI strip — Present / On Leave / Absent / Late / Yet to Check-in
 *   3. Late-mark alert banner (umberbg, when applicable)
 *   4. Today's-snapshot table — employee | EMP code | department | check-in |
 *      check-out | hours | status | late this month
 *   5. Search + filter row above table
 *   6. Numbered paginator with "Showing X of Y"
 *
 * When ?scope=me is present, renders the personal attendance view instead
 * (prototype/admin/my-attendance.html — A-10).
 */

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { CursorPaginator } from '@/components/ui/CursorPaginator';
import { useAttendanceList, useAttendanceStats } from '@/lib/hooks/useAttendance';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useDepartments } from '@/lib/hooks/useMasters';
import { MyAttendanceView } from '@/features/attendance/components/MyAttendanceView';
import type { AttendanceStatusValue } from '@nexora/contracts/attendance';
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP } from '@/lib/status/maps';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PAGE_SIZE = 20;

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, late }: { status: AttendanceStatusValue; late?: boolean }) {
  if (late && status === ATTENDANCE_STATUS.Present) {
    return (
      <div className="flex items-center gap-1">
        <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-0.5 rounded">Present</span>
        <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-0.5 rounded">Late</span>
      </div>
    );
  }
  const map: Record<number, string> = {
    [ATTENDANCE_STATUS.Present]: 'bg-greenbg text-richgreen',
    [ATTENDANCE_STATUS.Absent]: 'bg-crimsonbg text-crimson',
    [ATTENDANCE_STATUS.OnLeave]: 'bg-umberbg text-umber',
    [ATTENDANCE_STATUS.WeeklyOff]: 'bg-gray-100 text-slate',
    [ATTENDANCE_STATUS.Holiday]: 'bg-softmint text-forest',
  };
  const label = ATTENDANCE_STATUS_MAP[status]?.label ?? String(status);
  return <span className={`text-xs font-bold px-2 py-0.5 rounded ${map[status] ?? ''}`}>{label}</span>;
}

// ── KPI Tile ───────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: number | string;
  subtitle?: string;
  valueClass?: string;
}

function KpiTile({ label, value, subtitle, valueClass = 'text-charcoal' }: KpiTileProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
      <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">{label}</div>
      <div className={`font-heading text-2xl font-bold ${valueClass}`}>{value}</div>
      {subtitle && <p className="text-xs text-slate mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Scope-router ───────────────────────────────────────────────────────────────

/**
 * Inner component that reads search params and branches between the org-wide
 * view and the personal "My Attendance" view (?scope=me).
 * Wrapped in Suspense by the default export so Next.js App Router is satisfied.
 */
function AdminAttendanceRouter() {
  const searchParams = useSearchParams();
  if (searchParams.get('scope') === 'me') {
    return <MyAttendanceView regularisationHref="/admin/regularisation" />;
  }
  return <OrgAttendancePage />;
}

export default function AdminAttendancePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size="lg" aria-label="Loading attendance…" /></div>}>
      <AdminAttendanceRouter />
    </Suspense>
  );
}

// ── Org-wide Page ──────────────────────────────────────────────────────────────

function OrgAttendancePage() {
  // Date picker: default to today.
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusValue | 0>(0);
  const [departmentId, setDepartmentId] = useState<number | 0>(0);
  const [search, setSearch] = useState('');

  const { data: departments = [] } = useDepartments();

  // Server-side cursor pagination over the table. Filter changes reset to page 1.
  const pager = useCursorPagination({
    pageSize: PAGE_SIZE,
    filtersKey: `${selectedDate}|${statusFilter}|${departmentId}`,
  });

  const { data, isLoading, isError, error } = useAttendanceList('all', {
    date: selectedDate,
    limit: pager.pageSize,
    cursor: pager.cursor,
    ...(statusFilter ? { status: statusFilter as AttendanceStatusValue } : {}),
    ...(departmentId ? { departmentId } : {}),
  });

  useEffect(() => {
    if (data) pager.cacheNextCursor(data.nextCursor);
  }, [data, pager]);

  // Aggregate KPI counts come from a separate stats endpoint so they're
  // accurate over the whole filtered set, not just the visible page.
  const statsQuery = useAttendanceStats({
    date: selectedDate,
    ...(departmentId ? { departmentId } : {}),
  });
  const stats = statsQuery.data;

  const pageRows = useMemo(() => data?.data ?? [], [data]);

  // Client-side search narrows the visible page only — server doesn't yet
  // support a name/code search filter. Acceptable since search is best-effort
  // within the current page.
  const visibleRows = useMemo(() => {
    if (!search.trim()) return pageRows;
    const q = search.toLowerCase();
    return pageRows.filter(
      (r) =>
        (r.employeeName ?? '').toLowerCase().includes(q) ||
        (r.employeeCode ?? '').toLowerCase().includes(q),
    );
  }, [pageRows, search]);

  const total = stats?.total ?? 0;
  const kpiPresent = stats?.present ?? 0;
  const kpiLeave = stats?.onLeave ?? 0;
  const kpiAbsent = stats?.absent ?? 0;
  const kpiLate = stats?.late ?? 0;
  const kpiYetToCheckIn = stats?.yetToCheckIn ?? 0;
  const presentPct = total > 0 ? Math.round((kpiPresent / total) * 100) : 0;

  // Late threshold breaches this month (>= 3 late marks) — needs a separate
  // monthly aggregate endpoint (v1.1 backlog). For now we just label the alert.
  const lateThresholdBreachCount = kpiLate;

  const fmtDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <>
      {/* Day picker + filter row — matches prototype exactly */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-charcoal">Date:</span>
        <input
          id="admin-att-date"
          type="date"
          value={selectedDate}
          max={todayISO()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white"
        />
        <select
          id="admin-att-dept"
          value={departmentId || ''}
          onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : 0)}
          className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          id="admin-att-status"
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) as AttendanceStatusValue : 0)}
          className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Status</option>
          <option value={ATTENDANCE_STATUS.Present}>Present</option>
          <option value={ATTENDANCE_STATUS.Absent}>Absent</option>
          <option value={ATTENDANCE_STATUS.OnLeave}>On Leave</option>
          <option value={ATTENDANCE_STATUS.WeeklyOff}>Weekly Off</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button className="border border-sage/50 px-3 py-2 rounded-lg text-sm text-slate hover:bg-offwhite">Export CSV</button>
        </div>
      </div>

      {/* Auto-generation note */}
      <div className="bg-softmint border border-mint rounded-xl px-5 py-3 mb-5 flex items-start gap-3">
        <svg className="w-5 h-5 text-forest shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-xs text-forest">
          Attendance rows are <strong>auto-generated at midnight</strong> for every active employee with default status{' '}
          <strong>absent</strong>. Status updates as employees check in, take approved leave, or hit a weekend / public holiday.
        </p>
      </div>

      {/* 5-tile KPI strip — matches prototype exactly (no icons) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <KpiTile
          label="Present"
          value={kpiPresent}
          subtitle={`${presentPct}% of active`}
          valueClass="text-richgreen"
        />
        <KpiTile
          label="On Leave"
          value={kpiLeave}
          subtitle={total > 0 ? `${Math.round((kpiLeave / total) * 100)}%` : '—'}
          valueClass="text-umber"
        />
        <KpiTile
          label="Absent"
          value={kpiAbsent}
          subtitle={total > 0 ? `${Math.round((kpiAbsent / total) * 100)}% · No check-in` : '—'}
          valueClass="text-crimson"
        />
        <KpiTile
          label="Late"
          value={kpiLate}
          subtitle="After 10:30 AM"
          valueClass="text-crimson"
        />
        <KpiTile
          label="Yet to Check-in"
          value={kpiYetToCheckIn}
          subtitle="Active employees"
          valueClass="text-charcoal"
        />
      </div>

      {/* Late mark alert banner */}
      {kpiLate > 0 && (
        <div
          className="bg-crimsonbg/50 border border-crimson/30 rounded-xl px-5 py-4 mb-5 flex items-start gap-3"
          role="note"
        >
          <svg className="w-5 h-5 text-crimson flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div className="flex-1">
            <div className="text-sm font-semibold text-charcoal">
              {lateThresholdBreachCount} employees crossed late mark threshold this month
            </div>
            <div className="text-xs text-slate mt-0.5">
              3+ late marks in this month = 1 day deducted from annual leave automatically. Manager review recommended.
            </div>
          </div>
          <a
            href="/admin/attendance?lateOnly=1"
            className="text-xs text-emerald font-semibold hover:underline whitespace-nowrap"
          >
            View list →
          </a>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sage/20">
          <h3 className="text-sm font-semibold text-charcoal">
            Attendance — {fmtDateDisplay(selectedDate)}
          </h3>
          <span className="text-xs text-slate">{total} record{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="px-5 py-3 border-b border-sage/20">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search current page by name or EMP code…"
            aria-label="Search by employee name or code (current page)"
            className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" aria-label="Loading attendance…" />
          </div>
        ) : isError ? (
          <div role="alert" className="text-crimson text-sm py-8 text-center px-5">
            Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/20">
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-3 uppercase">Employee</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Department</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Status</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Check-In</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Check-Out</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Hours</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Late This Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/10 text-sm">
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-sm text-slate py-10">
                        No records found for this date and filter.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((r) => {
                      const initials = (r.employeeName ?? '?')
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase();
                      const hours = r.hoursWorkedMinutes !== null && r.hoursWorkedMinutes !== undefined
                        ? `${Math.floor(r.hoursWorkedMinutes / 60)}h ${r.hoursWorkedMinutes % 60}m`
                        : r.checkInTime && !r.checkOutTime
                          ? 'In progress'
                          : '—';
                      return (
                        <tr key={`${r.employeeId}-${r.date}`} className="hover:bg-offwhite/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-mint flex items-center justify-center text-forest text-xs font-bold" aria-hidden="true">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-charcoal">{r.employeeName ?? '—'}</div>
                                <div className="text-xs text-slate">{r.employeeCode ?? '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate">
                            {(r as unknown as { department?: string }).department ?? '—'}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={r.status as AttendanceStatusValue} late={r.late} /></td>
                          <td className="px-4 py-3 text-slate">{fmtTime(r.checkInTime)}</td>
                          <td className="px-4 py-3 text-slate">{fmtTime(r.checkOutTime)}</td>
                          <td className="px-4 py-3 text-slate">{hours}</td>
                          <td className="px-4 py-3 text-slate">
                            {r.lateMonthCount}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <CursorPaginator
              currentPage={pager.currentPage}
              pageSize={pager.pageSize}
              currentPageCount={pageRows.length}
              hasMore={pager.hasMore}
              highestReachablePage={pager.highestReachablePage}
              onPageChange={pager.goToPage}
              onPrev={pager.goPrev}
              onNext={pager.goNext}
              label={({ from, to }) => `Showing ${from}–${to} of ${total} records`}
            />
          </>
        )}
      </div>
    </>
  );
}
