import { clsx } from 'clsx';
import { ElementType, HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Renders as any HTML element (default: 'div') */
  as?: ElementType;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Card({ as: Tag = 'div', header, footer, children, className, ...rest }: CardProps) {
  return (
    <Tag
      className={clsx(
        'bg-white border border-sage/30 rounded-xl shadow-sm',
        className,
      )}
      {...rest}
    >
      {header && (
        <div className="px-5 py-4 border-b border-sage/20 font-heading text-base font-semibold text-charcoal">
          {header}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-sage/20 text-sm text-slate">
          {footer}
        </div>
      )}
    </Tag>
  );
}
