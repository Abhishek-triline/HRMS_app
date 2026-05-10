'use client';

/**
 * HierarchyPicker — autocomplete combobox for selecting a reporting manager.
 *
 * - Queries useEmployeesList({ status: 'Active', q: <search> }) debounced 300 ms
 * - Excludes the employee being edited (can't report to self)
 * - First option is always "No reporting manager" (null)
 * - On CIRCULAR_REPORTING from the backend, the parent form surfaces the error
 *   inline against this field — this component just holds the picker UI.
 */

import { useState, useRef, useEffect, useId } from 'react';
import { clsx } from 'clsx';
import { useEmployeesList } from '@/lib/hooks/useEmployees';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';

interface PickedManager {
  id: string;
  name: string;
  code: string;
  designation: string | null;
}

interface HierarchyPickerProps {
  /** Currently selected manager id (null = no manager) */
  value: string | null;
  /**
   * Called when the selection changes.
   * The second argument is the selected manager's display name (or null when cleared).
   */
  onChange: (managerId: string | null, managerName?: string | null) => void;
  /** ID of the employee being edited — excluded from results */
  excludeId?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

export function HierarchyPicker({
  value,
  onChange,
  excludeId,
  label = 'Reporting Manager',
  error,
  required,
  disabled = false,
}: HierarchyPickerProps) {
  const uid = useId();
  const inputId = `${uid}-manager`;
  const errorId = `${uid}-manager-error`;
  const listboxId = `${uid}-listbox`;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<PickedManager | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useEmployeesList({
    status: 'Active',
    q: debouncedQuery || undefined,
    limit: 10,
  });

  const candidates = (data?.data ?? []).filter((e) => e.id !== excludeId);

  // Sync display label when value changes externally
  useEffect(() => {
    if (value === null) {
      setSelectedDisplay(null);
    } else {
      const found = candidates.find((e) => e.id === value);
      if (found && found.id !== selectedDisplay?.id) {
        setSelectedDisplay({
          id: found.id,
          name: found.name,
          code: found.code,
          designation: found.designation,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, data]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function selectManager(manager: PickedManager | null) {
    if (manager === null) {
      setSelectedDisplay(null);
      onChange(null, null);
    } else {
      setSelectedDisplay(manager);
      onChange(manager.id, manager.name);
    }
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  const displayValue = open ? query : selectedDisplay?.name ?? '';

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}

      <div className="relative">
        {/* Search icon */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>

        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          type="text"
          value={displayValue}
          placeholder={selectedDisplay ? selectedDisplay.name : 'Search manager by name or EMP code…'}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          className={clsx(
            'w-full border rounded-lg pl-9 pr-9 py-2.5 text-sm text-charcoal bg-white',
            'placeholder:text-sage/70',
            'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
            'disabled:bg-offwhite disabled:cursor-not-allowed',
            error
              ? 'border-crimson focus:ring-crimson/20 focus:border-crimson'
              : 'border-sage/60',
          )}
        />

        {/* Clear button */}
        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear manager selection"
            onClick={() => selectManager(null)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sage hover:text-slate transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Manager suggestions"
          className="absolute z-50 mt-1 w-full max-w-sm border border-sage/40 rounded-lg bg-white shadow-md overflow-hidden"
        >
          {/* No manager option */}
          <li
            role="option"
            aria-selected={value === null}
            onClick={() => selectManager(null)}
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-sm transition-colors',
              value === null
                ? 'bg-softmint border-b border-sage/20'
                : 'hover:bg-offwhite border-b border-sage/10',
            )}
          >
            <div className="w-7 h-7 rounded-full bg-sage/20 flex items-center justify-center text-slate text-xs flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate">No reporting manager</div>
              <div className="text-xs text-sage">Top of tree / Admin</div>
            </div>
            {value === null && (
              <svg className="w-4 h-4 text-richgreen ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </li>

          {isLoading && (
            <li className="px-4 py-3 text-xs text-slate text-center">Searching…</li>
          )}

          {!isLoading && candidates.length === 0 && debouncedQuery && (
            <li className="px-4 py-3 text-xs text-slate text-center">No employees found</li>
          )}

          {candidates.map((emp) => {
            const isSelected = emp.id === value;
            return (
              <li
                key={emp.id}
                role="option"
                aria-selected={isSelected}
                onClick={() =>
                  selectManager({
                    id: emp.id,
                    name: emp.name,
                    code: emp.code,
                    designation: emp.designation,
                  })
                }
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors',
                  isSelected ? 'bg-softmint' : 'hover:bg-offwhite',
                )}
              >
                <div className="w-7 h-7 rounded-full bg-mint flex items-center justify-center text-forest text-xs font-bold flex-shrink-0">
                  {getInitials(emp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-charcoal truncate">{emp.name}</div>
                  <div className="text-xs text-slate truncate">
                    {emp.code}
                    {emp.designation ? ` · ${emp.designation}` : ''}
                  </div>
                </div>
                {isSelected && (
                  <svg className="w-4 h-4 text-richgreen flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <FieldError id={errorId} message={error} />
    </div>
  );
}
