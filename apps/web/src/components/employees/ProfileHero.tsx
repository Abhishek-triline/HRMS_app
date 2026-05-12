'use client';

/**
 * ProfileHero — forest-gradient hero card used by all four role profile pages.
 *
 * Reproduces the hero card from prototype/admin/profile.html and
 * prototype/manager/profile.html exactly:
 *   - Radial+linear gradient background (#1C3D2E → #2D7A5F → #4DA37A)
 *   - Hatched diagonal texture overlay (opacity-[0.04])
 *   - Three concentric rotated diamonds at the right edge (decorative)
 *   - Two particle dots scattered on the card
 *   - Avatar square with rounded-2xl + employee initials
 *   - Right block: name, meta line, status pill
 *
 * v2: status is an INT code (1–5), role is optional string label resolved by caller.
 */

import { EMPLOYEE_STATUS, EMPLOYEE_STATUS_MAP } from '@/lib/status/maps';

export interface ProfileHeroProps {
  name: string;
  empCode: string;
  designation?: string | null;
  department?: string | null;
  /** INT status code: 1=Active, 2=OnNotice, 3=OnLeave, 4=Inactive, 5=Exited */
  status: number;
  /** Computed from name if not provided */
  initials?: string;
  /** Optional role label shown after the meta line (e.g. "Manager") */
  role?: string | null;
  /** Optional join date ISO string */
  joinDate?: string | null;
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function formatJoinDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Returns Tailwind classes for the status pill on the dark hero background.
 * We use bg-white/20 variants so the pills stay readable on the forest gradient.
 */
function statusPillClasses(status: number): string {
  switch (status) {
    case EMPLOYEE_STATUS.Active:   return 'bg-greenbg text-richgreen';
    case EMPLOYEE_STATUS.OnNotice: return 'bg-umberbg text-umber';
    case EMPLOYEE_STATUS.Exited:   return 'bg-lockedbg text-lockedfg';
    case EMPLOYEE_STATUS.OnLeave:  return 'bg-mint text-forest';
    case EMPLOYEE_STATUS.Inactive: return 'bg-lockedbg text-lockedfg';
    default:                       return 'bg-greenbg text-richgreen';
  }
}

export function ProfileHero({
  name,
  empCode,
  designation,
  department,
  status,
  initials,
  role,
  joinDate,
}: ProfileHeroProps) {
  const avatarInitials = initials ?? computeInitials(name);
  const joinedLabel = formatJoinDate(joinDate);
  const statusLabel = EMPLOYEE_STATUS_MAP[status]?.label ?? 'Unknown';

  // Meta line: designation · empCode · department  (omit empty segments)
  const metaParts = [designation, empCode, department].filter(Boolean);

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white shadow-xl shadow-forest/30 mb-5"
      style={{
        background:
          'radial-gradient(ellipse 70% 70% at 100% 0%, rgba(255,215,153,0.20), transparent 55%),' +
          'radial-gradient(ellipse 70% 70% at 0% 100%, rgba(15,46,34,0.45), transparent 55%),' +
          'linear-gradient(135deg, #1C3D2E 0%, #2D7A5F 55%, #4DA37A 100%)',
      }}
    >
      {/* Top highlight wash */}
      <div
        className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)' }}
        aria-hidden="true"
      />

      {/* Diagonal hatch texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0, transparent 16px, white 16px, white 17px)',
        }}
        aria-hidden="true"
      />

      {/* Diamond decorations — right edge, three concentric */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: '24px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '11rem',
          height: '11rem',
          border: '2px solid rgba(255,255,255,0.10)',
          borderRadius: '1rem',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute pointer-events-none"
        style={{
          right: '56px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '7rem',
          height: '7rem',
          border: '1px solid rgba(200,230,218,0.30)',
          borderRadius: '0.75rem',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute pointer-events-none"
        style={{
          right: '80px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '3rem',
          height: '3rem',
          background: 'rgba(200,230,218,0.10)',
          backdropFilter: 'blur(4px)',
          borderRadius: '0.5rem',
        }}
        aria-hidden="true"
      />

      {/* Particle dots */}
      <div
        className="absolute top-6 left-1/3 w-1 h-1 rounded-full bg-white/60 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-8 left-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
        style={{
          background: 'rgba(200,230,218,0.60)',
          boxShadow: '0 0 5px rgba(200,230,218,0.5)',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative px-6 py-6 flex items-center gap-5 flex-wrap">
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-2xl bg-mint text-forest flex items-center justify-center font-heading text-3xl font-bold shrink-0"
          aria-label={`Avatar for ${name}`}
        >
          {avatarInitials}
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-2xl font-bold text-white">{name}</h2>
          {metaParts.length > 0 && (
            <p className="text-mint/80 text-sm mt-0.5">{metaParts.join(' · ')}</p>
          )}
          {(role || joinedLabel) && (
            <p className="text-mint/60 text-xs mt-1">
              {[role, joinedLabel ? `Joined ${joinedLabel}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        {/* Status pill */}
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 self-start ${statusPillClasses(status)}`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
