import { clsx } from 'clsx';

/**
 * MoneyDisplay — renders integer paise as ₹X,XX,XXX using Indian locale.
 *
 * Reuse rule: MoneyInput (Phase 1) handles EDITABLE money fields.
 * MoneyDisplay handles READ-ONLY display. They share the same locale/formatter
 * but serve different interaction models.
 */

const fmtINR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

interface MoneyDisplayProps {
  /** Value in paise (integer). ₹1 = 100 paise. */
  paise: number;
  className?: string;
  /** When true, negative values render in crimson (used for reversals / deductions). */
  colorCode?: boolean;
  /** Render as "—" instead of ₹0 when value is zero. */
  dashOnZero?: boolean;
}

export function MoneyDisplay({
  paise,
  className,
  colorCode = false,
  dashOnZero = false,
}: MoneyDisplayProps) {
  if (dashOnZero && paise === 0) {
    return <span className={clsx('text-slate', className)}>—</span>;
  }

  const formatted = fmtINR.format(paise / 100);

  return (
    <span
      className={clsx(
        colorCode && paise < 0 && 'text-crimson',
        colorCode && paise > 0 && 'text-richgreen',
        className,
      )}
    >
      {formatted}
    </span>
  );
}
