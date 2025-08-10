'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnnouncementBar } from '@/components/announcement-bar'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  identityVerified?: boolean
  roles?: string[]
}

interface VeriffAnnouncementBarProps {
  /** The current authenticated user */
  user: User | null
  /** Custom CSS classes */
  className?: string
  /** Callback when user clicks "Start Verification" */
  onStartVerification?: () => void
}

/**
 * Dynamic announcement bar that only shows to users who haven't completed Veriff identity verification
 */
export function VeriffAnnouncementBar({
  user,
  className,
  onStartVerification
}: VeriffAnnouncementBarProps) {
  console.log('🔍 VeriffAnnouncementBar - Component called with user:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    identityVerified: user?.identityVerified
  })
  
  const router = useRouter()
  const [shouldShow, setShouldShow] = useState(false)
  const [isTemporarilyDismissed, setIsTemporarilyDismissed] = useState(false)

  useEffect(() => {
    console.log('🔍 VeriffAnnouncementBar - useEffect triggered:', {
      hasUser: !!user,
      userIdentityVerified: user?.identityVerified,
      shouldShowAnnouncement: user && !user.identityVerified
    })
    
    // Check if user is authenticated and NOT identity verified
    if (user && !user.identityVerified) {
      // Check if temporarily dismissed (session-based, not persistent)
      const tempDismissed = sessionStorage.getItem(`veriff-temp-dismiss-${user.id}`)
      console.log('🔍 VeriffAnnouncementBar - Session dismissed check:', { tempDismissed, userId: user.id })
      setIsTemporarilyDismissed(Boolean(tempDismissed))
      setShouldShow(true)
    } else {
      setShouldShow(false)
      setIsTemporarilyDismissed(false)
    }
  }, [user])

  // Debug logging for render condition
  console.log('🔍 VeriffAnnouncementBar - Render check:', {
    shouldShow,
    hasUser: !!user,
    isTemporarilyDismissed,
    willRender: shouldShow && user && !isTemporarilyDismissed
  })

  // Don't render if user is verified, not authenticated, or temporarily dismissed
  if (!shouldShow || !user || isTemporarilyDismissed) {
    console.log('🔍 VeriffAnnouncementBar - Not rendering, returning null')
    return null
  }

  console.log('🔍 VeriffAnnouncementBar - Rendering announcement bar')

  const handleStartVerification = () => {
    if (onStartVerification) {
      onStartVerification()
    } else {
      // Default behavior: navigate to my-account page with verification tab
      router.push('/my-account?tab=verification')
    }
  }

  const handleTemporaryDismiss = () => {
    // Store temporary dismissal in sessionStorage (clears on page reload/close)
    sessionStorage.setItem(`veriff-temp-dismiss-${user.id}`, 'true')
    setIsTemporarilyDismissed(true)
  }

  const userDisplayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.email.split('@')[0]

  return (
    <AnnouncementBar
      version={`veriff-verification-${user.id}-persistent`}
      variant="info"
      className={cn(
        "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
        "border-b border-blue-200/50 dark:border-blue-800/30",
        "shadow-sm backdrop-blur-sm",
        className
      )}
      dismissible={true}
      onDismiss={handleTemporaryDismiss}
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              Identity Verification Required
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium hidden md:inline">
              Important
            </span>
          </div>
          
          <span className="text-sm text-blue-800 dark:text-blue-200 hidden md:inline">
            Hi <span className="font-medium">{userDisplayName}</span>! Complete your identity verification to access all features.
          </span>
        </div>
        
        <div className="flex items-center space-x-3 ml-6">
          <Button
            onClick={handleStartVerification}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium px-4 py-2"
          >
            Start Verification
          </Button>
        </div>
      </div>
    </AnnouncementBar>
  )
}

/**
 * Hook to determine if Veriff announcement should be shown
 */
export function useVeriffAnnouncement(user: User | null) {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    // Show announcement if user is authenticated but not identity verified
    setShouldShow(Boolean(user && !user.identityVerified))
  }, [user])

  return {
    shouldShow,
    needsVerification: Boolean(user && !user.identityVerified)
  }
}

/**
 * Utility function to check if user needs identity verification
 */
export function userNeedsVerification(user: User | null): boolean {
  return Boolean(user && !user.identityVerified)
}
