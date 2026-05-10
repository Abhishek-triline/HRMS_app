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
 */

import { useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import type { AttendanceStatus } from '@nexora/contracts/attendance';

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

const DEPARTMENTS = ['All Departments', 'Engineering', 'Design', 'Finance', 'Operations', 'HR'];
const PAGE_SIZE = 10;

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, late }: { status: AttendanceStatus; late?: boolean }) {
  if (late && status === 'Present') {
    return (
      <div className="flex items-center gap-1">
        <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-0.5 rounded">Present</span>
        <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-0.5 rounded">Late</span>
      </div>
    );
  }
  const map: Record<AttendanceStatus, string> = {
    Present: 'bg-greenbg text-richgreen',
    Absent: 'bg-crimsonbg text-crimson',
    'On-Leave': 'bg-umberbg text-umber',
    'Weekly-Off': 'bg-gray-100 text-slate',
    Holiday: 'bg-softmint text-forest',
  };
  const label = status === 'On-Leave' ? 'On Leave' : status === 'Weekly-Off' ? 'Weekly Off' : status;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded ${map[status]}`}>{label}</span>;
}

// ── KPI Tile ───────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  valueClass?: string;
}

function KpiTile({ label, value, subtitle, icon, valueClass = 'text-charcoal' }: KpiTileProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-offwhite flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">{label}</div>
          <div className={`font-heading text-2xl font-bold ${valueClass}`}>{value}</div>
          {subtitle && <p className="text-xs text-slate mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Paginator ─────────────────────────────────────────────────────────────────

interface PaginatorProps {
  page: number;
  totalPages: number;
  totalItems: number;
  showing: number;
  onChange: (p: number) => void;
}

function Paginator({ page, totalPages, totalItems, showing, onChange }: PaginatorProps) {
  if (totalPages <= 1) {
    return (
      <div className="flex justify-between items-center px-5 py-3 border-t border-sage/20 text-xs text-slate">
        <span>Showing {showing} of {totalItems} records</span>
      </div>
    );
  }

  const pages: number[] = [];
  for (let i = 1; i <= Math.min(totalPages, 5); i++) pages.push(i);

  return (
    <div className="flex justify-between items-center px-5 py-3 border-t border-sage/20 text-xs text-slate">
      <span>Showing {showing} of {totalItems} records</span>
      <nav aria-label="Pagination" className="flex gap-1.5">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="border border-sage/50 px-3 py-1.5 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`px-3 py-1.5 rounded ${p === page ? 'bg-forest text-white' : 'border border-sage/50 hover:bg-white'}`}
          >
            {p}
          </button>
        ))}
        {totalPages > 5 && page < totalPages && (
          <span className="px-2 py-1.5 text-slate">…</span>
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="border border-sage/50 px-3 py-1.5 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          Next
        </button>
      </nav>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAttendancePage() {
  const today = new Date();

  // Date picker: default to today, query month data then filter client-side
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('');
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Derive month range from selected date
  const [sy, sm] = selectedDate.split('-').map(Number);
  const from = `${sy}-${String(sm).padStart(2, '0')}-01`;
  const lastDay = new Date(sy, sm, 0).getDate();
  const to = `${sy}-${String(sm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, isLoading, isError, error } = useAttendanceList('all', {
    from,
    to,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(deptFilter && deptFilter !== 'All Departments' ? { department: deptFilter } : {}),
  });

  // Client-side filter to the chosen day
  const dayRows = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.filter((r) => r.date === selectedDate);
  }, [data, selectedDate]);

  // Apply text search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return dayRows;
    const q = search.toLowerCase();
    return dayRows.filter(
      (r) =>
        (r.employeeName ?? '').toLowerCase().includes(q) ||
        (r.employeeCode ?? '').toLowerCase().includes(q),
    );
  // dayRows is stable because it's computed from data + selectedDate
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayRows, search]);

  // KPI counts from the day's slice
  const kpiPresent = filteredRows.filter((r) => r.status === 'Present').length;
  const kpiLeave = filteredRows.filter((r) => r.status === 'On-Leave').length;
  const kpiAbsent = filteredRows.filter((r) => r.status === 'Absent').length;
  const kpiLate = filteredRows.filter((r) => r.late).length;
  // "Yet to check-in" = absent + no check-in (simple approximation)
  const kpiYetToCheckIn = filteredRows.filter(
    (r) => r.status === 'Absent' && !r.checkInTime,
  ).length;

  const totalActive = filteredRows.length;
  const presentPct = totalActive > 0 ? Math.round((kpiPresent / totalActive) * 100) : 0;

  // Late threshold breaches this month (>= 3 late marks) — approximate from data
  const lateThresholdBreachCount = 3; // placeholder; would need per-employee month counts

  // Pagination
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmtDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-6">

      {/* Day picker + filter row */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="admin-att-date" className="block text-xs font-semibold text-charcoal mb-1">Date</label>
          <input
            id="admin-att-date"
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
        </div>
        <div>
          <label htmlFor="admin-att-dept" className="block text-xs font-semibold text-charcoal mb-1">Department</label>
          <select
            id="admin-att-dept"
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          >
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="admin-att-status" className="block text-xs font-semibold text-charcoal mb-1">Status</label>
          <select
            id="admin-att-status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as AttendanceStatus | ''); setPage(1); }}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          >
            <option value="">All Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="On-Leave">On Leave</option>
            <option value="Weekly-Off">Weekly Off</option>
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label htmlFor="admin-att-search" className="block text-xs font-semibold text-charcoal mb-1">Search Employee</label>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="admin-att-search"
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Name or EMP code…"
              className="border border-sage/50 rounded-lg pl-9 pr-3 py-2 text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
          </div>
        </div>
        <div className="ml-auto">
          <button className="border border-sage/50 px-3 py-2 rounded-lg text-sm text-slate hover:bg-offwhite transition-colors">
            Export CSV
          </button>
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

      {/* 5-tile KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <KpiTile
          label="Present"
          value={kpiPresent}
          subtitle={`${presentPct}% of active`}
          valueClass="text-richgreen"
          icon={
            <svg className="w-5 h-5 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          }
        />
        <KpiTile
          label="On Leave"
          value={kpiLeave}
          subtitle={totalActive > 0 ? `${Math.round((kpiLeave / totalActive) * 100)}%` : '—'}
          valueClass="text-umber"
          icon={
            <svg className="w-5 h-5 text-umber" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          }
        />
        <KpiTile
          label="Absent"
          value={kpiAbsent}
          subtitle={totalActive > 0 ? `${Math.round((kpiAbsent / totalActive) * 100)}% · No check-in` : '—'}
          valueClass="text-crimson"
          icon={
            <svg className="w-5 h-5 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          }
        />
        <KpiTile
          label="Late"
          value={kpiLate}
          subtitle="After 10:30 AM"
          valueClass="text-crimson"
          icon={
            <svg className="w-5 h-5 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <KpiTile
          label="Yet to Check-in"
          value={kpiYetToCheckIn}
          subtitle="Active employees"
          valueClass="text-charcoal"
          icon={
            <svg className="w-5 h-5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          }
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
          <span className="text-xs text-slate">{totalItems} records</span>
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
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">EMP Code</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Department</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Check-In</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Check-Out</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Hours</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Status</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Late This Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/10 text-sm">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-sm text-slate py-10">
                        No records found for this date and filter.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => {
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
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate">{r.employeeCode ?? '—'}</td>
                          <td className="px-4 py-3 text-slate text-xs">—</td>
                          <td className="px-4 py-3 text-slate">{fmtTime(r.checkInTime)}</td>
                          <td className="px-4 py-3 text-slate">{fmtTime(r.checkOutTime)}</td>
                          <td className="px-4 py-3 text-slate text-xs">{hours}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.status} late={r.late} /></td>
                          <td className="px-4 py-3 text-slate text-xs">—</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Paginator
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={pageRows.length}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
