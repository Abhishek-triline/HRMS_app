/**
 * Thin server-side shell that imports MobileDrawer (client component).
 * Needed so RoleLayout (server component) can pass props down to the drawer.
 */
import type { RoleKey } from './roleNavConfig';
import { MobileDrawer } from './MobileDrawer';

interface MobileDrawerWrapperProps {
  role: RoleKey;
  currentPath: string;
}

export function MobileDrawerWrapper(props: MobileDrawerWrapperProps) {
  return <MobileDrawer {...props} />;
}
