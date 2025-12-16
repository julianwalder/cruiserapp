import { ReactNode } from 'react';

interface NoStrictModeProps {
  children: ReactNode;
}

/**
 * Wrapper component to disable React Strict Mode for specific components
 * Used for third-party libraries that don't handle Strict Mode's double-mounting well
 * (e.g., Leaflet's MapContainer)
 */
export default function NoStrictMode({ children }: NoStrictModeProps) {
  return <>{children}</>;
}
