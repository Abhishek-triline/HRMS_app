'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { clsx } from 'clsx';
import { Label } from './Label';
import { FieldError } from './FieldError';

// SVG Icons
const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.977 9.977 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Hide the label visually but keep it for a11y */
  srOnlyLabel?: boolean;
  required?: boolean;
  /** ID for aria-describedby on the error */
  errorId?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      srOnlyLabel = false,
      required,
      type = 'text',
      id,
      errorId,
      className,
      ...rest
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const fieldId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const descId = errorId ?? (fieldId ? `${fieldId}-error` : undefined);

    return (
      <div className="w-full">
        {label && (
          <Label
            htmlFor={fieldId}
            required={required}
            className={srOnlyLabel ? 'sr-only' : undefined}
          >
            {label}
          </Label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            type={inputType}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error && descId ? descId : undefined}
            className={clsx(
              'w-full border rounded-lg py-2.5 text-sm text-charcoal bg-white',
              'placeholder:text-sage/70',
              'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
              leftIcon ? 'pl-10' : 'pl-3.5',
              isPassword ? 'pr-10' : 'pr-3.5',
              error ? 'border-crimson focus:ring-crimson/20 focus:border-crimson' : 'border-sage',
              className,
            )}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sage hover:text-forest transition-colors"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
        </div>
        <FieldError id={descId} message={error} />
      </div>
    );
  },
);

Input.displayName = 'Input';
