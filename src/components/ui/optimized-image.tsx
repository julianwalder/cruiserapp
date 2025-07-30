'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: number;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = 16 / 9,
  placeholder,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(true);
      setImageSrc(''); // Ensure imageSrc is empty when no src
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Optimize Vercel Blob URLs
    let optimizedSrc = src;
    if (src.startsWith('http')) {
      // Add Vercel Blob optimization parameters
      optimizedSrc = `${src}?w=400&h=300&fit=crop&f=webp&q=80`;
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

  // Show placeholder if no src, empty src, or error
  if (!src || !imageSrc || hasError) {
    return (
      <div 
        className={cn(
          "w-full bg-muted flex items-center justify-center",
          className
        )}
        style={{ aspectRatio }}
      >
        {placeholder || (
          <div className="text-muted-foreground">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio }}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Optimized image - only render if we have a valid imageSrc */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
} 