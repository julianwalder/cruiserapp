'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface OptimizedAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedAvatar({
  src,
  alt = 'Avatar',
  fallback,
  className,
  size = 'md',
  onLoad,
  onError
}: OptimizedAvatarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(true);
      setImageSrc('');
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Optimize Vercel Blob URLs for avatars
    let optimizedSrc = src;
    if (src.startsWith('http')) {
      // Add Vercel Blob optimization parameters for avatars
      // Use square aspect ratio and appropriate size for avatars
      optimizedSrc = `${src}?w=200&h=200&fit=crop&f=webp&q=85`;
    }

    setImageSrc(optimizedSrc);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const getInitials = (name?: string) => {
    if (!name) return <User className="h-4 w-4" />;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageSrc && (
        <AvatarImage 
          src={imageSrc} 
          alt={alt}
          className={cn(
            "object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      <AvatarFallback className="text-sm font-semibold">
        {fallback ? getInitials(fallback) : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
} 