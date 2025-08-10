'use client'

import { useState } from 'react'
import { AnnouncementBar, useAnnouncement } from '@/components/announcement-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnnouncementDemoPage() {
  const [currentDemo, setCurrentDemo] = useState<string | null>(null)
  
  // Hook examples
  const defaultDemo = useAnnouncement('demo-default')
  const warningDemo = useAnnouncement('demo-warning')
  const infoDemo = useAnnouncement('demo-info')
  const successDemo = useAnnouncement('demo-success')

  const demos = [
    {
      id: 'demo-default',
      title: 'Default Announcement',
      variant: 'default' as const,
      content: '🚀 This is a default announcement with primary colors',
      hook: defaultDemo,
    },
    {
      id: 'demo-warning',
      title: 'Warning Announcement',
      variant: 'warning' as const,
      content: '⚠️ Scheduled maintenance tonight 11 PM - 1 AM EST',
      hook: warningDemo,
    },
    {
      id: 'demo-info',
      title: 'Info Announcement',
      variant: 'info' as const,
      content: 'ℹ️ New flight scheduling features are now available. Check them out!',
      hook: infoDemo,
    },
    {
      id: 'demo-success',
      title: 'Success Announcement',
      variant: 'success' as const,
      content: '✅ System migration completed successfully. All services restored.',
      hook: successDemo,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Render current demo announcement */}
      {currentDemo && (
        <AnnouncementBar
          version={currentDemo}
          variant={demos.find(d => d.id === currentDemo)?.variant || 'default'}
          onDismiss={() => setCurrentDemo(null)}
        >
          {demos.find(d => d.id === currentDemo)?.content}
        </AnnouncementBar>
      )}

      {/* Demo content with proper offset */}
      <div className="announcement-offset">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Announcement Bar Demo
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Test the different announcement bar variants and functionality
              </p>
            </div>

            {/* Demo Controls */}
            <div className="grid gap-6 md:grid-cols-2">
              {demos.map((demo) => (
                <Card key={demo.id} className="border border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">{demo.title}</CardTitle>
                    <CardDescription>
                      Status: {demo.hook.isLoading 
                        ? 'Loading...' 
                        : demo.hook.isDismissed 
                          ? 'Dismissed' 
                          : 'Active'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {demo.content}
                    </p>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => setCurrentDemo(demo.id)}
                        disabled={currentDemo === demo.id}
                        size="sm"
                      >
                        Show
                      </Button>
                      
                      <Button
                        onClick={() => setCurrentDemo(null)}
                        variant="outline"
                        size="sm"
                        disabled={currentDemo !== demo.id}
                      >
                        Hide
                      </Button>
                      
                      <Button
                        onClick={demo.hook.reset}
                        variant="outline"
                        size="sm"
                        disabled={!demo.hook.isDismissed}
                      >
                        Reset Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Feature showcase */}
            <div className="mt-12 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-green-600 dark:text-green-400">
                        ✅ Layout & Performance
                      </h3>
                      <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                        <li>• Fixed positioning with iOS safe area support</li>
                        <li>• No layout shift (CLS) - content properly offset</li>
                        <li>• ResizeObserver for dynamic height tracking</li>
                        <li>• SSR-safe with hydration handling</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-green-600 dark:text-green-400">
                        ✅ User Experience
                      </h3>
                      <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                        <li>• Persistent dismissal via localStorage</li>
                        <li>• Keyboard navigation (ESC to close)</li>
                        <li>• Screen reader accessible</li>
                        <li>• Multiple visual variants</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Testing Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Keyboard Testing:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      1. Show any announcement above<br/>
                      2. Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Tab</kbd> to focus the dismiss button<br/>
                      3. Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Escape</kbd> to dismiss
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Persistence Testing:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      1. Dismiss any announcement<br/>
                      2. Refresh the page - it should stay dismissed<br/>
                      3. Use "Reset Dismiss" to show it again
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Layout Testing:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      1. Show/hide announcements and observe how content moves<br/>
                      2. No overlap should occur with page content<br/>
                      3. Scroll behavior should work correctly
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Sample content for scroll testing */}
              <Card>
                <CardHeader>
                  <CardTitle>Sample Content for Testing</CardTitle>
                  <CardDescription>
                    This content helps verify that the announcement bar properly offsets page content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-gray-600 dark:text-gray-400">
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                      incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
                      nostrud exercitation ullamco laboris.
                    </p>
                    <p>
                      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
                      eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, 
                      sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                    <p>
                      Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
                      doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore 
                      veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
