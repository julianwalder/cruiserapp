'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 120, height = 40 }: LogoProps) {
  const { theme } = useTheme();
  
  // Default to black logo if theme is not available yet
  const logoSrc = theme === 'dark' ? '/logo_ca_white.svg' : '/logo_ca_black.svg';
  
  return (
    <Image
      src={logoSrc}
      alt="Cruiser Aviation"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
} 