/**
 * Auth route group layout.
 * Transparent passthrough — each page controls its own background and centering.
 * Login uses a full-bleed forest-green canvas; forgot-password, reset-password,
 * and first-login use the offwhite centred card pattern.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
