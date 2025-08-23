'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { VeriffAnnouncementBar } from './veriff-announcement-bar'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  identityVerified?: boolean
  roles?: string[]
}

/**
 * Client component that fetches user data and conditionally renders announcement bars
 */
export function ConditionalAnnouncementWrapper() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // Handle hydration
  useEffect(() => {
    console.log('🔍 ConditionalAnnouncementWrapper - Hydration effect running')
    setIsHydrated(true)
  }, [])

  // Function to fetch user data
  const fetchUserData = React.useCallback(async () => {
    console.log('🔍 ConditionalAnnouncementWrapper - fetchUserData called, isHydrated:', isHydrated)
    
    // Don't fetch if not hydrated yet
    if (!isHydrated) {
      console.log('🔍 ConditionalAnnouncementWrapper - Not hydrated yet, skipping fetch')
      return
    }

    try {
      // Check for impersonation token first, then fall back to regular token
      const impersonationToken = localStorage.getItem('impersonationToken');
      const token = impersonationToken || localStorage.getItem('token');
      console.log('🔍 ConditionalAnnouncementWrapper - Token found:', !!token, 'Using impersonation token:', !!impersonationToken)
      
      if (!token) {
        console.log('🔍 ConditionalAnnouncementWrapper - No token, setting user to null')
        setUser(null)
        setIsLoading(false)
        return
      }

      console.log('🔍 ConditionalAnnouncementWrapper - Making API call to /api/auth/me')
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log('🔍 ConditionalAnnouncementWrapper - API response status:', response.status)

      if (response.ok) {
        const userData = await response.json()
        console.log('🔍 ConditionalAnnouncementWrapper - User data received:', {
          id: userData.id,
          email: userData.email,
          identityVerified: userData.identityVerified
        })
        
        // Clear announcement dismissal state on login to ensure it shows
        const announcementKey = `announcement-dismissed-veriff-verification-${userData.id}-persistent`
        localStorage.removeItem(announcementKey)
        console.log('🔍 ConditionalAnnouncementWrapper - Cleared announcement dismissal state for user:', userData.id)
        
        setUser(userData)
      } else {
        // Token might be invalid, clear it
        console.log('🔍 ConditionalAnnouncementWrapper - API call failed, clearing token')
        localStorage.removeItem('token')
        setUser(null)
      }
    } catch (error) {
      console.error('🔍 ConditionalAnnouncementWrapper - Error fetching user data:', error)
      setUser(null)
    } finally {
      console.log('🔍 ConditionalAnnouncementWrapper - Setting isLoading to false')
      setIsLoading(false)
    }
  }, [isHydrated])

  // Initial fetch on mount (after hydration)
  useEffect(() => {
    console.log('🔍 ConditionalAnnouncementWrapper - Initial fetch effect, isHydrated:', isHydrated)
    if (isHydrated) {
      console.log('🔍 ConditionalAnnouncementWrapper - Hydrated, calling fetchUserData')
      fetchUserData()
    }
  }, [fetchUserData, isHydrated])

  // Listen for storage changes (login/logout)
  useEffect(() => {
    if (!isHydrated) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        // Token was added or removed, refetch user data
        setIsLoading(true)
        fetchUserData()
      }
    }

    // Listen for storage events (when user logs in/out in another tab)
    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom events (when user logs in/out in same tab)
    const handleAuthChange = () => {
      setIsLoading(true)
      fetchUserData()
    }

    window.addEventListener('auth-change', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [fetchUserData, isHydrated])

  // Poll for user data changes (in case verification status changes)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchUserData()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [user, fetchUserData])

  // Debug logging
  console.log('🔍 ConditionalAnnouncementWrapper - Render state:', {
    isHydrated,
    isLoading,
    hasUser: !!user,
    userIdentityVerified: user?.identityVerified,
    shouldShowAnnouncement: user && !user.identityVerified
  })

  // Don't render anything while not hydrated, loading, or if no user
  if (!isHydrated || isLoading) {
    return null
  }

  return (
    <>
      {/* Veriff Identity Verification Announcement */}
      <VeriffAnnouncementBar user={user} />
    </>
  )
}
