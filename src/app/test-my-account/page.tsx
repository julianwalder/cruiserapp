'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  FileText, 
  CreditCard, 
  Shield, 
  GraduationCap, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Edit,
  Upload,
  Eye,
  Plane,
  BookOpen
} from 'lucide-react';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';

// Mock user data for testing
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+40 123 456 789',
  dateOfBirth: '1990-01-01',
  address: '123 Aviation Street',
  city: 'Bucharest',
  state: 'București',
  zipCode: '010000',
  country: 'Romania',
  personalNumber: '1234567890123',
  status: 'ACTIVE',
  totalFlightHours: 0,
  licenseNumber: null,
  medicalClass: null,
  instructorRating: null,
  identityVerified: false,
  onboardingCompleted: false,
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date(),
  userRoles: [
    {
      roles: {
        id: 'prospect-role-id',
        name: 'PROSPECT'
      }
    }
  ]
};

export default function TestMyAccountPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'STUDENT' | 'PILOT' | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboardingSelection, setShowOnboardingSelection] = useState(false);

  // Auto-show onboarding selection for prospects on page load
  useEffect(() => {
    if (hasRole('PROSPECT')) {
      // Small delay to ensure the page is fully loaded
      const timer = setTimeout(() => {
        setShowOnboardingSelection(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const hasRole = (roleName: string) => {
    return mockUser.userRoles.some(userRole => userRole.roles.name === roleName) || false;
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'PROSPECT':
        return 'Prospect';
      case 'STUDENT':
        return 'Student';
      case 'PILOT':
        return 'Pilot';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'PROSPECT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STUDENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PILOT':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleStartOnboarding = (type: 'STUDENT' | 'PILOT') => {
    setOnboardingType(type);
    setShowOnboarding(true);
    setShowOnboardingSelection(false); // Close the selection modal
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingType(null);
    alert('Onboarding completed! In a real app, this would update the user role and refresh the page.');
  };

  const handleOnboardingCancel = () => {
    setShowOnboarding(false);
    setOnboardingType(null);
  };

  const handleCloseSelection = () => {
    setShowOnboardingSelection(false);
  };

  // Show onboarding flow if active
  if (showOnboarding && onboardingType) {
    return (
      <AppLayout pageTitle="Onboarding">
        <OnboardingFlow 
          onboardingType={onboardingType}
          onComplete={handleOnboardingComplete}
          onCancel={handleOnboardingCancel}
          userId={mockUser.id}
          userData={{
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            email: mockUser.email,
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="My Account - Test">
      <div className="space-y-6">
        {/* Test Mode Banner */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Test Mode
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This is a demonstration of the My Account feature using mock data. 
                  The onboarding flow is fully functional but won't persist changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials(mockUser.firstName, mockUser.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{mockUser.firstName} {mockUser.lastName}</h1>
                <p className="text-muted-foreground">{mockUser.email}</p>
                <div className="flex gap-2 mt-2">
                  {mockUser.userRoles?.map((userRole, index) => (
                    <Badge 
                      key={`${userRole.roles.name}-${index}`} 
                      className={`text-sm ${getRoleBadgeColor(userRole.roles.name)}`}
                    >
                      {getRoleDisplayName(userRole.roles.name)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <Badge 
                  variant={mockUser.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="mb-2"
                >
                  {mockUser.status === 'ACTIVE' ? 'Active' : mockUser.status}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(mockUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Personal Info</span>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Credentials</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            {(hasRole('STUDENT') || hasRole('PILOT')) && (
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Progress</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Account Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Identity Verification</span>
                      <Badge variant={mockUser.identityVerified ? 'default' : 'secondary'}>
                        {mockUser.identityVerified ? 'Verified' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Onboarding</span>
                      <Badge variant={mockUser.onboardingCompleted ? 'default' : 'secondary'}>
                        {mockUser.onboardingCompleted ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Account Status</span>
                      <Badge variant={mockUser.status === 'ACTIVE' ? 'default' : 'destructive'}>
                        {mockUser.status === 'ACTIVE' ? 'Active' : mockUser.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hasRole('PROSPECT') && (
                      <>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => handleStartOnboarding('STUDENT')}
                        >
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Start PPL Course
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => handleStartOnboarding('PILOT')}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Rent Aircraft
                        </Button>
                      </>
                    )}
                    <Button className="w-full justify-start" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium">Account created</p>
                      <p className="text-muted-foreground">
                        {new Date(mockUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {mockUser.lastLoginAt && (
                      <div className="text-sm">
                        <p className="font-medium">Last login</p>
                        <p className="text-muted-foreground">
                          {new Date(mockUser.lastLoginAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Important Notices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasRole('PROSPECT') ? (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">
                          Complete Your Onboarding
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Choose your path: become a student or rent aircraft to get started.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p>No important notices at this time.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Personal Information
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-lg">{mockUser.firstName} {mockUser.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-lg flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {mockUser.email}
                      </p>
                    </div>
                    {mockUser.phone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="text-lg flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {mockUser.phone}
                        </p>
                      </div>
                    )}
                    {mockUser.dateOfBirth && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                        <p className="text-lg flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(mockUser.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {mockUser.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="text-lg flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {mockUser.address}
                          {mockUser.city && `, ${mockUser.city}`}
                          {mockUser.state && `, ${mockUser.state}`}
                          {mockUser.zipCode && ` ${mockUser.zipCode}`}
                        </p>
                      </div>
                    )}
                    {mockUser.country && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Country</label>
                        <p className="text-lg">{mockUser.country}</p>
                      </div>
                    )}
                    {mockUser.personalNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Personal Number</label>
                        <p className="text-lg">{mockUser.personalNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Flight Credentials
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage your flight-related documents and certificates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* PPL License */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="font-medium">PPL License</h4>
                        <p className="text-sm text-muted-foreground">
                          {mockUser.licenseNumber ? `License #${mockUser.licenseNumber}` : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {mockUser.licenseNumber ? (
                        <>
                          <Badge variant="default">Uploaded</Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Medical Certificate */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium">Medical Certificate</h4>
                        <p className="text-sm text-muted-foreground">
                          {mockUser.medicalClass ? `Class ${mockUser.medicalClass}` : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {mockUser.medicalClass ? (
                        <>
                          <Badge variant="default">Uploaded</Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Radio Certificate */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="font-medium">Radio Certificate</h4>
                        <p className="text-sm text-muted-foreground">Required for pilots</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Plans & Invoices</CardTitle>
                <CardDescription>
                  View your payment plans and download invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4" />
                  <p>No payment plans or invoices found.</p>
                  <p className="text-sm mt-1">Payment information will appear here once you complete onboarding.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Documents
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </CardTitle>
                <CardDescription>
                  All your uploaded documents and contracts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>No documents uploaded yet.</p>
                  <p className="text-sm mt-1">Upload your documents to get started.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab (Students & Pilots only) */}
          {(hasRole('STUDENT') || hasRole('PILOT')) && (
            <TabsContent value="progress" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {hasRole('STUDENT') ? 'Learning Progress' : 'Flight Hours'}
                  </CardTitle>
                  <CardDescription>
                    {hasRole('STUDENT') 
                      ? 'Track your PPL course progress' 
                      : 'Monitor your flight hours and usage'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4" />
                    <p>
                      {hasRole('STUDENT') 
                        ? 'Your learning progress will appear here once you start your PPL course.'
                        : 'Your flight hours and usage statistics will appear here.'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Auto-popup Onboarding Selection Modal */}
      <Dialog open={showOnboardingSelection} onOpenChange={setShowOnboardingSelection}>
        <DialogContent 
          className="w-[90vw] max-w-none !max-w-[90vw] max-h-[90vh] overflow-y-auto"
          style={{ width: '90vw', maxWidth: '90vw', maxHeight: '90vh' }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Welcome to Cruiser Aviation!
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              Let's get you started! Choose how you'd like to begin your aviation journey.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-6 max-w-6xl mx-auto">
            {/* Student Card */}
            <Card 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-blue-200 group p-4 lg:p-6"
              onClick={() => handleStartOnboarding('STUDENT')}
            >
              <div className="flex flex-col lg:block">
                <div className="flex items-center gap-4 lg:block">
                  <div className="flex-shrink-0 w-20 h-20 lg:w-auto lg:h-auto">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                      <GraduationCap className="h-10 w-10 lg:h-16 lg:w-16 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 lg:block">
                    <CardHeader className="pb-3 lg:pb-3">
                      <CardTitle className="text-lg lg:text-xl text-blue-700 group-hover:text-blue-800">
                        Start PPL Course
                      </CardTitle>
                      <p className="text-sm lg:text-base text-muted-foreground">
                        Complete your Private Pilot License (A) course with our experienced instructors
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0 lg:pt-0">
                      <div className="space-y-2 lg:space-y-3">
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                          <span>45 hours minimum flight training</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                          <span>Theory classes included</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                          <span>Flexible payment plans</span>
                        </div>
                        <div className="pt-1 lg:pt-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            From 13,500 RON
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </div>
            </Card>

            {/* Pilot Card */}
            <Card 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-green-200 group p-4 lg:p-6"
              onClick={() => handleStartOnboarding('PILOT')}
            >
              <div className="flex flex-col lg:block">
                <div className="flex items-center gap-4 lg:block">
                  <div className="flex-shrink-0 w-20 h-20 lg:w-auto lg:h-auto">
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                      <Plane className="h-10 w-10 lg:h-16 lg:w-16 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 lg:block">
                    <CardHeader className="pb-3 lg:pb-3">
                      <CardTitle className="text-lg lg:text-xl text-green-700 group-hover:text-green-800">
                        Rent Aircraft
                      </CardTitle>
                      <p className="text-sm lg:text-base text-muted-foreground">
                        Access our well-maintained fleet for your flying needs
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0 lg:pt-0">
                      <div className="space-y-2 lg:space-y-3">
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                          <span>Multiple aircraft types available</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                          <span>Flexible hour packages</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                          <span>Insurance included</span>
                        </div>
                        <div className="pt-1 lg:pt-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            From 750 RON
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={handleCloseSelection}>
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
} 