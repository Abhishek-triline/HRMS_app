import { clsx } from 'clsx';

export type BadgeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'on-leave'
  | 'exited'
  | 'finalised'
  | 'locked'
  | 'on-notice'
  | 'draft'
  | 'inactive'
  | 'processing'
  | 'review';

const statusConfig: Record<
  BadgeStatus,
  { label: string; bg: string; text: string; icon?: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-umberbg',
    text: 'text-umber',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-greenbg',
    text: 'text-richgreen',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-crimsonbg',
    text: 'text-crimson',
  },
  active: {
    label: 'Active',
    bg: 'bg-greenbg',
    text: 'text-richgreen',
  },
  'on-leave': {
    label: 'On Leave',
    bg: 'bg-mint',
    text: 'text-forest',
  },
  exited: {
    label: 'Exited',
    bg: 'bg-lockedbg',
    text: 'text-lockedfg',
  },
  finalised: {
    label: 'Finalised',
    bg: 'bg-greenbg',
    text: 'text-richgreen',
  },
  locked: {
    label: 'Locked',
    bg: 'bg-lockedbg',
    text: 'text-lockedfg',
    icon: 'lock',
  },
  'on-notice': {
    label: 'On Notice',
    bg: 'bg-umberbg',
    text: 'text-umber',
  },
  draft: {
    label: 'Draft',
    bg: 'bg-umberbg',
    text: 'text-umber',
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-lockedbg',
    text: 'text-lockedfg',
  },
  processing: {
    label: 'Processing',
    bg: 'bg-softmint',
    text: 'text-forest',
  },
  review: {
    label: 'Review',
    bg: 'bg-mint',
    text: 'text-forest',
  },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
  /** Override the display label */
  label?: string;
}

const LockIcon = () => (
  <svg
    className="w-2.5 h-2.5 mr-1 inline-block"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded tracking-[0.03em]',
        config.bg,
        config.text,
        className,
      )}
    >
      {config.icon === 'lock' && <LockIcon />}
      {label ?? config.label}
    </span>
  );
}
