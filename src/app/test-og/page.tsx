'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TestOGPage() {
  const [title, setTitle] = useState('Cruiser Aviation Dashboard');
  const [subtitle, setSubtitle] = useState('Flight Management System');
  const [type, setType] = useState('dashboard');
  const [user, setUser] = useState('John Doe');
  const [stats, setStats] = useState('Flights:150, Hours:1,250, Aircraft:12');

  const generateOGUrl = (route: 'basic' | 'advanced' | 'simple' | 'negative' | 'negative-advanced') => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      title,
      subtitle,
      type,
      user,
      stats,
    });

    if (route === 'basic') {
      return `${baseUrl}/api/og?${params.toString()}`;
    } else if (route === 'advanced') {
      return `${baseUrl}/api/og/advanced?${params.toString()}`;
    } else if (route === 'negative') {
      return `${baseUrl}/api/og/negative?${params.toString()}`;
    } else if (route === 'negative-advanced') {
      return `${baseUrl}/api/og/negative/advanced?${params.toString()}`;
    } else {
      return `${baseUrl}/api/og/simple?${params.toString()}`;
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">OG Image Generator Test</h1>
          <p className="text-muted-foreground">
            Test and preview Open Graph images for your aviation app
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Image Configuration</CardTitle>
                <CardDescription>
                  Customize the OG image content and layout
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter image title"
                  />
                </div>

                <div>
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Enter image subtitle"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Layout Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select layout type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="flight-log">Flight Log</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="user">User (Advanced)</Label>
                  <Input
                    id="user"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="Enter user name"
                  />
                </div>

                <div>
                  <Label htmlFor="stats">Stats (Advanced)</Label>
                  <Input
                    id="stats"
                    value={stats}
                    onChange={(e) => setStats(e.target.value)}
                    placeholder="Format: Label:Value,Label:Value"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: Flights:150, Hours:1,250, Aircraft:12
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated URLs</CardTitle>
                <CardDescription>
                  Copy these URLs to use in your meta tags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Basic OG Image URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={generateOGUrl('basic')}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generateOGUrl('basic'))}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Advanced OG Image URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={generateOGUrl('advanced')}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generateOGUrl('advanced'))}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Simple OG Image URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={generateOGUrl('simple')}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generateOGUrl('simple'))}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Negative OG Image URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={generateOGUrl('negative')}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generateOGUrl('negative'))}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Negative Advanced OG Image URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={generateOGUrl('negative-advanced')}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generateOGUrl('negative-advanced'))}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic OG Image Preview</CardTitle>
                <CardDescription>
                  Simple layout with title and subtitle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={generateOGUrl('basic')}
                    alt="Basic OG Image Preview"
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced OG Image Preview</CardTitle>
                <CardDescription>
                  Dynamic layout with multiple types and stats display
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={generateOGUrl('advanced')}
                    alt="Advanced OG Image Preview"
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Simple OG Image Preview</CardTitle>
                <CardDescription>
                  Clean and simple layout without complex styling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={generateOGUrl('simple')}
                    alt="Simple OG Image Preview"
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Negative OG Image Preview</CardTitle>
                <CardDescription>
                  Inverted colors - black background with white elements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={generateOGUrl('negative')}
                    alt="Negative OG Image Preview"
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Negative Advanced OG Image Preview</CardTitle>
                <CardDescription>
                  Inverted colors with multiple layouts and stats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={generateOGUrl('negative-advanced')}
                    alt="Negative Advanced OG Image Preview"
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Meta Tag Example */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Meta Tag Example</CardTitle>
            <CardDescription>
              Add this to your page head for social media sharing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<head>
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${subtitle}" />
  <meta property="og:image" content="${generateOGUrl('advanced')}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${subtitle}" />
  <meta name="twitter:image" content="${generateOGUrl('advanced')}" />
</head>`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 