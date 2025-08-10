'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AnnouncementBarProps {
  /** Unique version identifier for the announcement */
  version: string
  /** The announcement message or JSX content */
  children: React.ReactNode
  /** Custom CSS classes */
  className?: string
  /** Custom background variant */
  variant?: 'default' | 'warning' | 'info' | 'success'
  /** Show/hide close button */
  dismissible?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
}

const variantStyles = {
  default: 'bg-primary text-primary-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-blue text-blue-foreground',
  success: 'bg-success text-success-foreground',
}

export function AnnouncementBar({
  version,
  children,
  className,
  variant = 'default',
  dismissible = true,
  onDismiss,
}: AnnouncementBarProps) {
  const [isDismissed, setIsDismissed] = React.useState(false)
  const [isHydrated, setIsHydrated] = React.useState(false)
  const barRef = React.useRef<HTMLDivElement>(null)
  const storageKey = `announcement-dismissed-${version}`

  // Handle hydration
  React.useEffect(() => {
    setIsHydrated(true)
    // Check if this announcement was previously dismissed
    const dismissed = localStorage.getItem(storageKey) === 'true'
    setIsDismissed(dismissed)
  }, [storageKey])

  // Update CSS custom property for content offset
  React.useEffect(() => {
    if (!isHydrated) return

    const updateHeight = () => {
      const height = isDismissed || !barRef.current ? 0 : barRef.current.offsetHeight
      console.log('🔍 AnnouncementBar - Updating height:', { height, isDismissed, hasBarRef: !!barRef.current })
      document.documentElement.style.setProperty('--announcement-height', `${height}px`)
    }

    // Initial height set
    updateHeight()

    // Use ResizeObserver to track height changes
    let resizeObserver: ResizeObserver | undefined
    if (barRef.current && !isDismissed) {
      resizeObserver = new ResizeObserver(updateHeight)
      resizeObserver.observe(barRef.current)
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [isDismissed, isHydrated])

  // Separate effect to handle dismissal cleanup
  React.useEffect(() => {
    if (isDismissed && isHydrated) {
      console.log('🔍 AnnouncementBar - Setting height to 0px due to dismissal')
      document.documentElement.style.setProperty('--announcement-height', '0px')
    }
  }, [isDismissed, isHydrated])

  const handleDismiss = React.useCallback(() => {
    // Update CSS variable immediately when dismissing
    console.log('🔍 AnnouncementBar - Dismissing, setting height to 0px')
    document.documentElement.style.setProperty('--announcement-height', '0px')
    
    setIsDismissed(true)
    localStorage.setItem(storageKey, 'true')
    onDismiss?.()
  }, [storageKey, onDismiss])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && dismissible) {
      handleDismiss()
    }
  }, [dismissible, handleDismiss])

  // Don't render during SSR or if dismissed
  if (!isHydrated || isDismissed) {
    return null
  }

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Site announcement"
      className={cn(
        'fixed top-0 left-0 right-0 z-[1000] w-full',
        'pt-[env(safe-area-inset-top)] transition-all duration-300 ease-in-out',
        variantStyles[variant],
        className
      )}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 mx-auto max-w-screen-2xl">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-center">
            {children}
          </div>
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className={cn(
              'h-6 w-6 p-0 hover:bg-white/20 focus-visible:ring-white/50',
              'text-current shrink-0'
            )}
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Helper hook for managing announcement state
export function useAnnouncement(version: string) {
  const [isDismissed, setIsDismissed] = React.useState<boolean | null>(null)
  const storageKey = `announcement-dismissed-${version}`

  React.useEffect(() => {
    const dismissed = localStorage.getItem(storageKey) === 'true'
    setIsDismissed(dismissed)
  }, [storageKey])

  const dismiss = React.useCallback(() => {
    localStorage.setItem(storageKey, 'true')
    setIsDismissed(true)
  }, [storageKey])

  const reset = React.useCallback(() => {
    localStorage.removeItem(storageKey)
    setIsDismissed(false)
  }, [storageKey])

  return {
    isDismissed,
    dismiss,
    reset,
    isLoading: isDismissed === null,
  }
}
