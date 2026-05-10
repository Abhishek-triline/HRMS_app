'use client';

/**
 * A-19 — Holiday Calendar Editor (Admin)
 *
 * Year picker + table of holidays for that year.
 * Add row, edit row (inline), delete row, save replaces via PUT /config/holidays.
 * All destructive actions go through a consequence-stating modal.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal, useModal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { useHolidays, useReplaceHolidays } from '@/lib/hooks/useHolidays';
import type { Holiday } from '@nexora/contracts/attendance';

// ── Local holiday row type (extends Holiday with editing state) ────────────────

type EditableHoliday = {
  id: string; // original or 'new-<n>' for unsaved rows
  date: string;
  name: string;
  isNew?: boolean;
  editing?: boolean;
};

function holidayToEditable(h: Holiday): EditableHoliday {
  return { id: h.id, date: h.date, name: h.name };
}

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [localRows, setLocalRows] = useState<EditableHoliday[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EditableHoliday | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const deleteModal = useModal();
  const saveModal = useModal();

  const { data: serverHolidays, isLoading } = useHolidays(year);
  const replaceMutation = useReplaceHolidays();

  // Derived: working copy (local edits take precedence over server data)
  const rows: EditableHoliday[] = localRows ?? (serverHolidays ?? []).map(holidayToEditable);

  // Reset when year changes
  const handleYearChange = useCallback((y: number) => {
    setYear(y);
    setLocalRows(null);
    setSaveErrors({});
  }, []);

  const handleAddRow = useCallback(() => {
    const newRow: EditableHoliday = {
      id: `new-${Date.now()}`,
      date: `${year}-01-01`,
      name: '',
      isNew: true,
      editing: true,
    };
    setLocalRows((prev) => [...(prev ?? (serverHolidays ?? []).map(holidayToEditable)), newRow]);
  }, [year, serverHolidays]);

  const handleEdit = useCallback((id: string) => {
    setLocalRows((prev) =>
      (prev ?? (serverHolidays ?? []).map(holidayToEditable)).map((r) =>
        r.id === id ? { ...r, editing: true } : r,
      ),
    );
  }, [serverHolidays]);

  const handleFieldChange = useCallback(
    (id: string, field: 'date' | 'name', value: string) => {
      setLocalRows((prev) =>
        (prev ?? (serverHolidays ?? []).map(holidayToEditable)).map((r) =>
          r.id === id ? { ...r, [field]: value } : r,
        ),
      );
    },
    [serverHolidays],
  );

  const handleSaveRow = useCallback((id: string) => {
    setLocalRows((prev) =>
      (prev ?? []).map((r) => (r.id === id ? { ...r, editing: false, isNew: false } : r)),
    );
    setSaveErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  }, []);

  const handleDeleteRow = useCallback((row: EditableHoliday) => {
    setDeleteTarget(row);
    deleteModal.open();
  }, [deleteModal]);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setLocalRows((prev) =>
      (prev ?? (serverHolidays ?? []).map(holidayToEditable)).filter((r) => r.id !== deleteTarget.id),
    );
    deleteModal.close();
    setDeleteTarget(null);
  }, [deleteTarget, serverHolidays, deleteModal]);

  const handleSaveAll = () => {
    // Validate
    const errors: Record<string, string> = {};
    for (const r of rows) {
      if (!r.date.match(/^\d{4}-\d{2}-\d{2}$/)) errors[r.id] = 'Invalid date';
      if (!r.name.trim()) errors[r.id] = (errors[r.id] ? errors[r.id] + '; ' : '') + 'Name required';
      if (!r.date.startsWith(String(year))) errors[r.id] = (errors[r.id] ? errors[r.id] + '; ' : '') + `Date must be in ${year}`;
    }
    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors);
      return;
    }
    setSaveErrors({});
    saveModal.open();
  };

  const confirmSave = () => {
    replaceMutation.mutate(
      {
        year,
        holidays: rows.map((r) => ({ date: r.date, name: r.name.trim() })),
      },
      {
        onSuccess: (saved) => {
          setLocalRows(saved.map(holidayToEditable));
          saveModal.close();
        },
        onError: () => {
          saveModal.close();
        },
      },
    );
  };

  const hasPendingEdits = localRows !== null;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-charcoal">Holiday Calendar</h1>
          <p className="text-sm text-slate mt-1">Manage public holidays for a given year. Saving replaces all holidays for the selected year.</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label htmlFor="holiday-year" className="sr-only">Year</label>
            <input
              id="holiday-year"
              type="number"
              value={year}
              min={2000}
              max={2999}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="border border-sage rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest w-28"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddRow}
          >
            + Add Holiday
          </Button>
          {hasPendingEdits && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAll}
              loading={replaceMutation.isPending}
            >
              Save {year} Calendar
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-sage/20 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm text-charcoal">
            {year} Holidays
            {rows.length > 0 && <span className="text-slate font-normal ml-2">({rows.length})</span>}
          </h2>
          {hasPendingEdits && (
            <span className="text-xs font-semibold text-umber bg-umberbg px-2 py-0.5 rounded">Unsaved changes</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" aria-label="Loading holidays…" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-offwhite border-b border-sage/30">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate px-5 py-3">#</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">Holiday Name</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">Day</th>
                  <th className="text-right text-xs font-semibold text-slate px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-slate py-10">
                      No holidays configured for {year}. Click "Add Holiday" to begin.
                    </td>
                  </tr>
                ) : (
                  rows
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((row, idx) => {
                      const dateObj = new Date(row.date + 'T00:00:00');
                      const dayName = !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString('en-IN', { weekday: 'long' })
                        : '—';

                      return (
                        <tr key={row.id} className="hover:bg-offwhite/60 transition-colors">
                          <td className="px-5 py-3 text-slate text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            {row.editing ? (
                              <input
                                type="date"
                                value={row.date}
                                min={`${year}-01-01`}
                                max={`${year}-12-31`}
                                onChange={(e) => handleFieldChange(row.id, 'date', e.target.value)}
                                className="border border-sage rounded px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
                              />
                            ) : (
                              <span className="font-medium text-charcoal">{row.date}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.editing ? (
                              <div>
                                <input
                                  type="text"
                                  value={row.name}
                                  maxLength={120}
                                  onChange={(e) => handleFieldChange(row.id, 'name', e.target.value)}
                                  placeholder="Holiday name…"
                                  className="border border-sage rounded px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 w-full max-w-xs"
                                  aria-label="Holiday name"
                                />
                                {saveErrors[row.id] && (
                                  <p className="text-crimson text-xs mt-0.5">{saveErrors[row.id]}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-charcoal">{row.name || <span className="italic text-slate">Unnamed</span>}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate text-xs">{dayName}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {row.editing ? (
                                <button
                                  type="button"
                                  onClick={() => handleSaveRow(row.id)}
                                  className="text-xs font-semibold text-richgreen hover:text-forest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded"
                                >
                                  Done
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEdit(row.id)}
                                  className="text-xs font-semibold text-forest hover:text-emerald transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row)}
                                className="text-xs font-semibold text-crimson hover:text-crimson/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson/40 rounded"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        title="Delete Holiday"
        size="sm"
        requireConfirm
        consequenceText={`This will remove "${deleteTarget?.name || 'this holiday'}" (${deleteTarget?.date ?? ''}) from the working list. Changes are not saved until you click "Save Calendar".`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={deleteModal.close}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-slate">
          Are you sure you want to remove <strong className="text-charcoal">{deleteTarget?.name}</strong> on{' '}
          <strong className="text-charcoal">{deleteTarget?.date}</strong>?
        </p>
      </Modal>

      {/* Save confirmation modal */}
      <Modal
        isOpen={saveModal.isOpen}
        onClose={saveModal.close}
        title={`Save ${year} Holiday Calendar`}
        size="sm"
        requireConfirm
        consequenceText={`This will REPLACE all ${rows.length} holiday entries for ${year} on the server. This cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={saveModal.close} disabled={replaceMutation.isPending}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmSave}
              loading={replaceMutation.isPending}
            >
              Confirm Save
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate">
          You are about to save <strong className="text-charcoal">{rows.length} holiday{rows.length !== 1 ? 's' : ''}</strong> for{' '}
          <strong className="text-charcoal">{year}</strong>. The existing calendar for this year will be fully replaced.
        </p>
      </Modal>
    </div>
  );
}
