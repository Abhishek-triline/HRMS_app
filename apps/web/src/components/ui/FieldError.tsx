import { clsx } from 'clsx';

interface FieldErrorProps {
  id?: string;
  message?: string;
  className?: string;
}

export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className={clsx('text-xs text-crimson mt-1', className)}
    >
      {message}
    </p>
  );
}
