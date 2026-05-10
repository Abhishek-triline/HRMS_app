'use client';

/**
 * MoneyInput — INR currency input.
 *
 * Displays value in rupees (₹), stores and calls onChange with integer paise.
 * Uses Intl.NumberFormat('en-IN') for display.
 *
 * Props:
 *   valuePaise   — controlled value in paise
 *   onChangePaise — callback with new value in paise
 *   label        — field label
 *   error        — field error string
 *   required     — shows crimson asterisk
 *   id           — for label association
 */

import { useId, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';

// Formats rupees for display (no decimals — paise hidden from user)
const fmt = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

interface MoneyInputProps {
  id?: string;
  label?: string;
  error?: string;
  required?: boolean;
  /** Controlled value in paise */
  valuePaise: number;
  /** Called with new value in paise */
  onChangePaise: (paise: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MoneyInput({
  id,
  label,
  error,
  required,
  valuePaise,
  onChangePaise,
  disabled = false,
  placeholder = '0',
}: MoneyInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  // Display as rupees (integer division; paise < 100 are ignored in display)
  const rupeesValue = valuePaise > 0 ? String(Math.floor(valuePaise / 100)) : '';

  const [raw, setRaw] = useState(rupeesValue);

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    setRaw(valuePaise > 0 ? String(Math.floor(valuePaise / 100)) : '');
  }, [valuePaise]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setRaw(val);
    const rupees = val === '' ? 0 : parseInt(val, 10);
    onChangePaise(isNaN(rupees) ? 0 : rupees * 100);
  }

  // Format on blur for readability, parse back on focus
  function handleBlur() {
    if (raw) {
      const rupees = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(rupees)) {
        setRaw(fmt.format(rupees));
      }
    }
  }

  function handleFocus() {
    // Strip formatting on focus so user can type cleanly
    if (raw) {
      setRaw(raw.replace(/[^0-9]/g, ''));
    }
  }

  const grossLakhs = valuePaise > 0 ? (valuePaise / 100 / 100_000).toFixed(2) : null;

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm select-none"
          aria-hidden="true"
        >
          ₹
        </span>
        <input
          id={fieldId}
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={clsx(
            'w-full border rounded-lg pl-7 pr-3.5 py-2.5 text-sm text-charcoal bg-white',
            'placeholder:text-sage/70',
            'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
            'disabled:bg-offwhite disabled:cursor-not-allowed',
            error
              ? 'border-crimson focus:ring-crimson/20 focus:border-crimson'
              : 'border-sage/60',
          )}
        />
      </div>
      {grossLakhs && (
        <p className="text-xs text-slate mt-1">
          {grossLakhs} L / month
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
