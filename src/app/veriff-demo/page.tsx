'use client'

import { useState } from 'react'
import { VeriffAnnouncementBar, useVeriffAnnouncement, userNeedsVerification } from '@/components/veriff-announcement-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react'

interface MockUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  identityVerified?: boolean
  roles?: string[]
}

export default function VeriffDemoPage() {
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null)
  
  const mockUsers: MockUser[] = [
    {
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      identityVerified: false,
      roles: ['PILOT']
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      identityVerified: true,
      roles: ['INSTRUCTOR']
    },
    {
      id: '3',
      email: 'newuser@example.com',
      identityVerified: false,
      roles: ['PROSPECT']
    },
    {
      id: '4',
      email: 'admin@cruiserapp.com',
      firstName: 'Admin',
      lastName: 'User',
      identityVerified: true,
      roles: ['SUPER_ADMIN']
    }
  ]

  const announcement = useVeriffAnnouncement(selectedUser)

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Veriff Announcement Bar Demo</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          This demo shows how the identity verification announcement bar appears for different user types.
          The announcement only shows for users who haven't completed their Veriff identity verification.
        </p>
      </div>

      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Select a User to Test
          </CardTitle>
          <CardDescription>
            Choose a user to see how the announcement bar behaves based on their verification status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockUsers.map((user) => (
              <Button
                key={user.id}
                variant={selectedUser?.id === user.id ? "default" : "outline"}
                onClick={() => setSelectedUser(user)}
                className="h-auto p-4 flex flex-col items-start space-y-2"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email.split('@')[0]
                    }
                  </span>
                  {user.identityVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-muted-foreground">{user.email}</span>
                  <Badge variant={user.identityVerified ? "default" : "secondary"}>
                    {user.identityVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current User Status */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Current User Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">User Details</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Roles:</strong> {selectedUser.roles?.join(', ')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold">Verification Status</h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={selectedUser.identityVerified ? "default" : "destructive"}>
                      {selectedUser.identityVerified ? "Identity Verified" : "Not Verified"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={announcement.shouldShow ? "secondary" : "outline"}>
                      {announcement.shouldShow ? "Announcement Shown" : "Announcement Hidden"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={announcement.needsVerification ? "destructive" : "default"}>
                      {announcement.needsVerification ? "Needs Verification" : "No Action Required"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Utility Function Demo */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Utility Function Results</h4>
              <div className="text-sm">
                <p><code>userNeedsVerification(user)</code>: <strong>{userNeedsVerification(selectedUser) ? 'true' : 'false'}</strong></p>
                <p><code>useVeriffAnnouncement(user).shouldShow</code>: <strong>{announcement.shouldShow ? 'true' : 'false'}</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcement Bar Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Live Announcement Bar Preview</CardTitle>
          <CardDescription>
            {selectedUser 
              ? `Below is how the announcement bar appears for ${selectedUser.firstName || selectedUser.email.split('@')[0]}`
              : "Select a user above to see the announcement bar preview"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="border rounded-lg p-4 bg-muted/30">
              <VeriffAnnouncementBar 
                user={selectedUser}
                onStartVerification={() => {
                  alert(`Starting verification process for ${selectedUser.email}`)
                }}
              />
              {!announcement.shouldShow && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No announcement shown - user has completed identity verification</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a user above to see the announcement bar preview</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h4>How It Works</h4>
          <ul>
            <li><strong>Conditional Rendering:</strong> The announcement only shows when <code>user.identityVerified === false</code></li>
            <li><strong>Personalization:</strong> Uses the user's name or email for personalized messaging</li>
            <li><strong>Persistent Until Verification:</strong> Announcement reappears on page reload until verification is complete</li>
            <li><strong>Temporary Dismissal:</strong> Users can dismiss for the current session, but it reappears on page reload</li>
            <li><strong>Click Action:</strong> "Start Verification" button navigates to <code>/my-account?tab=verification</code> by default</li>
          </ul>
          
          <h4>Integration</h4>
          <ul>
            <li>The <code>ConditionalAnnouncementWrapper</code> automatically fetches user data from <code>/api/auth/me</code></li>
            <li>Only shows for authenticated users (requires valid JWT token in localStorage)</li>
            <li>Automatically updates when user verification status changes</li>
            <li>Works alongside other announcement bars with proper height management</li>
          </ul>

          <h4>Customization Options</h4>
          <ul>
            <li><strong>Variant:</strong> Uses "info" with custom blue gradient styling</li>
            <li><strong>Message:</strong> Can be customized per user role or other criteria</li>
            <li><strong>Action:</strong> Custom <code>onStartVerification</code> callback can override default behavior</li>
            <li><strong>Styling:</strong> Light blue gradient background with subtle shadows and rounded elements</li>
          </ul>

          <h4>Dismissal Behavior</h4>
          <ul>
            <li><strong>Session-Based:</strong> Dismissal is stored in sessionStorage, not localStorage</li>
            <li><strong>Page Reload Reset:</strong> Announcement reappears when user refreshes the page</li>
            <li><strong>Verification Complete:</strong> Announcement permanently disappears when <code>identityVerified === true</code></li>
            <li><strong>User-Friendly:</strong> Allows users to dismiss temporarily while ensuring they don't forget to verify</li>
          </ul>

          <h4>Styling Features</h4>
          <ul>
            <li><strong>Light Background:</strong> Soft blue gradient instead of harsh warning colors</li>
            <li><strong>Icon Badge:</strong> Shield icon in a rounded blue background</li>
            <li><strong>Important Tag:</strong> Small "Important" badge for context</li>
            <li><strong>Personalized Greeting:</strong> User's name highlighted in the message</li>
            <li><strong>Modern Buttons:</strong> Blue primary button with hover effects</li>
            <li><strong>Dark Mode Support:</strong> Proper color adaptation for dark themes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
