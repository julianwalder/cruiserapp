import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ShadcnTest() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">shadcn/ui Test</h1>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Form</CardTitle>
          <CardDescription>
            This is a test to verify shadcn/ui components are working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter your password" />
          </div>
          <div className="flex gap-2">
            <Button variant="default">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 