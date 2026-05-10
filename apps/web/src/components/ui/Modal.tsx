'use client';

import { useEffect, useRef, useState, ReactNode, KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Body content */
  children: ReactNode;
  /** Footer action buttons */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** For destructive modals: show consequence callout text before confirm */
  requireConfirm?: boolean;
  /** Callout text shown in destructive modals above actions */
  consequenceText?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  requireConfirm = false,
  consequenceText,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      // Focus the dialog on next tick so it renders first
      setTimeout(() => {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.[0]?.focus();
      }, 10);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previouslyFocusedRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    // Focus trap
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className={clsx(
          'relative bg-white rounded-2xl shadow-xl border border-sage/20 w-full',
          sizeClasses[size],
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage/20">
          <h2 id="modal-title" className="font-heading text-lg font-bold text-charcoal">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate hover:bg-offwhite hover:text-forest transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {children}

          {/* Destructive consequence callout */}
          {requireConfirm && consequenceText && (
            <div className="mt-4 bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-crimson flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm text-crimson">{consequenceText}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-sage/20 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Convenience hook — tracks open/close state
export function useModal(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
