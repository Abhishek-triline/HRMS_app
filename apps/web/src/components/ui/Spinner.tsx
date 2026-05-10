import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

export function Spinner({ size = 'md', className, 'aria-label': ariaLabel = 'Loading…' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={clsx(
        'inline-block rounded-full border-forest/30 border-t-forest animate-spin',
        sizeClasses[size],
        className,
      )}
    />
  );
}
