'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 120, height = 40 }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme to avoid hydration mismatch
  const logoSrc = mounted && (resolvedTheme === 'dark' || theme === 'dark') 
    ? '/logo_ca_white.svg' 
    : '/logo_ca_black.svg';
  
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