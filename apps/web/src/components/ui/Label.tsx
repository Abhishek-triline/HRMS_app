import { LabelHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required, className, ...rest }: LabelProps) {
  return (
    <label
      className={clsx('block text-xs font-medium text-slate mb-1.5', className)}
      {...rest}
    >
      {children}
      {required && (
        <span className="text-crimson ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
