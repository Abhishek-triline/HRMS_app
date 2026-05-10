import { forwardRef, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Icon shown at the right side (not shown when loading) */
  trailingIcon?: React.ReactNode;
  /** Icon shown at the left side (not shown when loading) */
  leadingIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-forest to-emerald hover:from-emerald hover:to-emerald text-white shadow-lg shadow-forest/30 disabled:from-sage disabled:to-sage disabled:shadow-none',
  secondary:
    'border border-forest text-forest bg-white hover:bg-softmint disabled:border-sage disabled:text-sage disabled:bg-white',
  destructive:
    'bg-crimson hover:bg-crimson/90 text-white shadow-sm shadow-crimson/30 disabled:bg-sage disabled:shadow-none',
  ghost:
    'text-slate hover:text-forest hover:bg-softmint disabled:text-sage disabled:bg-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5 min-h-[32px]',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2 min-h-[40px]',
  lg: 'px-5 py-3 text-sm rounded-lg gap-2 min-h-[44px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      trailingIcon,
      leadingIcon,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={clsx(
          'group inline-flex items-center justify-center font-semibold transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Spinner size="sm" aria-label="Loading…" />
        ) : (
          leadingIcon
        )}
        {children}
        {!loading && trailingIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
