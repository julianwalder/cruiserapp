'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  User, 
  FileText, 
  CreditCard, 
  Shield, 
  ShieldAlert,
  GraduationCap, 
  Clock,
  XCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Edit,
  Upload,
  Download,
  Eye,
  Plus
} from 'lucide-react';
import { User as UserType } from '@/types/uuid-types';
import { cn } from '@/lib/utils';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { VeriffVerification } from '@/components/ui/veriff-verification';

// Extended User interface for My Account with userRoles
interface MyAccountUser extends UserType {
  userRoles: Array<{
    roles: {
      id: string;
      name: string;
    };
  }>;
  // My Account specific fields (from user_profile table)
  identityVerified?: boolean;
  onboardingCompleted?: boolean;
  lastLoginAt?: Date;
  idNumber?: string;
  personalNumber?: string;
  avatarUrl?: string;
  veriffData?: any;
}

export default function MyAccountPage() {
  const [user, setUser] = useState<MyAccountUser | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'STUDENT' | 'PILOT' | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const hasRole = (roleName: string) => {
    return user?.userRoles.some(userRole => userRole.roles.name === roleName) || false;
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'PROSPECT':
        return 'Prospect';
      case 'STUDENT':
        return 'Student';
      case 'PILOT':
        return 'Pilot';
      case 'INSTRUCTOR':
        return 'Instructor';
      case 'BASE_MANAGER':
        return 'Base Manager';
      case 'ADMIN':
        return 'Admin';
      case 'SUPER_ADMIN':
        return 'Super Admin';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'PROSPECT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'STUDENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PILOT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'INSTRUCTOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'BASE_MANAGER':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'SUPER_ADMIN':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (firstName: string | undefined | null, lastName: string | undefined | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleStartOnboarding = (type: 'STUDENT' | 'PILOT') => {
    setOnboardingType(type);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingType(null);
    // Refresh user data to get updated role
    window.location.reload();
  };

  const handleOnboardingCancel = () => {
    setShowOnboarding(false);
    setOnboardingType(null);
  };

  const handleAvatarChange = (newAvatarUrl: string) => {
    if (user) {
      setUser({
        ...user,
        avatarUrl: newAvatarUrl
      });
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="My Account">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading account information...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout pageTitle="My Account">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to load account</h2>
            <p className="text-muted-foreground">Please try refreshing the page or contact support.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show onboarding flow if active
  if (showOnboarding && onboardingType) {
    return (
      <AppLayout pageTitle="Onboarding">
        <OnboardingFlow 
          onboardingType={onboardingType}
          onComplete={handleOnboardingComplete}
          onCancel={handleOnboardingCancel}
          userId={user?.id || ''}
          userData={{
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="My Account">
      <div className="space-y-6">
        {/* User Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-6">
              {/* Avatar Upload Section */}
              <div className="flex-shrink-0">
                <AvatarUpload
                  currentAvatarUrl={user.avatarUrl}
                  onAvatarChange={handleAvatarChange}
                  size="lg"
                  userName={`${user.firstName} ${user.lastName}`}
                />
              </div>
              
              {/* User Info Section */}
              <div className="flex-1 flex flex-col justify-center min-h-[96px]">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
                  
                  {/* Verification Status */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          {user.identityVerified ? (
                            <Shield className="h-5 w-5 text-green-500" />
                          ) : (
                            <ShieldAlert className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {user.identityVerified 
                            ? "Identity verified" 
                            : "Identity verification pending"
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex gap-2">
                  {user.userRoles?.map((userRole, index) => (
                    <Badge 
                      key={`${userRole.roles.name}-${index}`} 
                      className={cn("text-sm", getRoleBadgeColor(userRole.roles.name))}
                    >
                      {getRoleDisplayName(userRole.roles.name)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Status Section */}
              <div className="text-right flex flex-col justify-center min-h-[96px]">
                <Badge 
                  variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="mb-2"
                >
                  {user.status === 'ACTIVE' ? 'Active' : user.status}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Personal Info</span>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">License and Certificates</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>

                    </TabsList>

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
                      <p className="text-lg">{user.firstName} {user.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-lg flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </p>
                    </div>
                    {user.phone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="text-lg flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {user.phone}
                        </p>
                      </div>
                    )}
                    {user.dateOfBirth && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                        <p className="text-lg flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(user.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {user.idNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">ID Number</label>
                        <p className="text-lg">{user.idNumber}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {user.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="text-lg flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {user.address}
                          {user.city && `, ${user.city}`}
                          {user.state && `, ${user.state}`}
                          {user.zipCode && ` ${user.zipCode}`}
                        </p>
                      </div>
                    )}
                    {user.country && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Country</label>
                        <p className="text-lg">{user.country}</p>
                      </div>
                    )}
                    {user.personalNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Personal Number</label>
                        <p className="text-lg">{user.personalNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity Verification & ID Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Identity Verification & ID Details
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardTitle>
                <CardDescription>
                  Official identification information extracted and verified by Veriff
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Personal Information */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        Full Name
                        {user.veriffData?.person?.givenName && (
                          <Shield className="h-3 w-3 text-blue-600" />
                        )}
                      </label>
                      <p className="text-lg">
                        {user.veriffData?.person?.givenName && user.veriffData?.person?.lastName 
                          ? `${user.veriffData.person.givenName} ${user.veriffData.person.lastName}`
                          : `${user.firstName} ${user.lastName}`
                        }
                      </p>
                    </div>
                    
                    {user.veriffData?.person?.dateOfBirth && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Date of Birth
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(user.veriffData.person.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    {user.veriffData?.person?.idNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          ID Number
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{user.veriffData.person.idNumber}</p>
                      </div>
                    )}
                    
                    {user.veriffData?.person?.nationality && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Nationality
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{user.veriffData.person.nationality}</p>
                      </div>
                    )}
                    
                    {user.veriffData?.person?.gender && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Gender
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{user.veriffData.person.gender}</p>
                      </div>
                    )}
                    
                    {user.personalNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Personal Number (CNP)
                          {user.identityVerified && (
                            <Shield className="h-3 w-3 text-blue-600" />
                          )}
                        </label>
                        <p className="text-lg">{user.personalNumber}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Document Information */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        Document Type
                        {user.veriffData?.document?.type && (
                          <Shield className="h-3 w-3 text-blue-600" />
                        )}
                      </label>
                      <p className="text-lg">
                        {user.veriffData?.document?.type || 'Passport / National ID'}
                      </p>
                    </div>
                    
                    {user.veriffData?.document?.number && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Document Number
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{user.veriffData.document.number}</p>
                      </div>
                    )}
                    
                    {user.veriffData?.document?.country && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Document Country
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{user.veriffData.document.country}</p>
                      </div>
                    )}
                    
                    {user.veriffData?.document?.issuedBy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Issued By
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{user.veriffData.document.issuedBy}</p>
                      </div>
                    )}
                    
                    {user.veriffData?.document?.validFrom && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Valid From
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{new Date(user.veriffData.document.validFrom).toLocaleDateString()}</p>
                      </div>
                    )}
                    
                    {user.veriffData?.document?.validUntil && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Valid Until
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{new Date(user.veriffData.document.validUntil).toLocaleDateString()}</p>
                      </div>
                    )}
                    
                    {user.country && !user.veriffData?.document?.country && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Nationality / Country
                          {user.identityVerified && (
                            <Shield className="h-3 w-3 text-blue-600" />
                          )}
                        </label>
                        <p className="text-lg">{user.country}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={user.veriffData?.status === 'approved' ? 'default' : 'secondary'}>
                          {user.veriffData?.status === 'approved' ? 'Approved' : 
                           user.veriffData?.status === 'submitted' ? 'Submitted' : 
                           user.veriffData?.status === 'created' ? 'Created' : 'Pending'}
                        </Badge>
                        {user.veriffData?.status === 'approved' && (
                          <Shield className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                    
                    {user.veriffData?.decisionScore && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Decision Score
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">{Math.round(user.veriffData.decisionScore * 100)}%</p>
                      </div>
                    )}
                    
                    {user.veriffData?.additionalVerification?.faceMatch && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          Face Match
                          <Shield className="h-3 w-3 text-blue-600" />
                        </label>
                        <p className="text-lg">
                          {user.veriffData.additionalVerification.faceMatch.status === 'approved' ? 'Approved' : 
                           user.veriffData.additionalVerification.faceMatch.status === 'pending' ? 'Pending' : 'Declined'}
                          {user.veriffData.additionalVerification.faceMatch.similarity && 
                            ` (${Math.round(user.veriffData.additionalVerification.faceMatch.similarity * 100)}%)`
                          }
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Verification Method</label>
                      <p className="text-lg">Veriff AI-Powered ID Verification</p>
                    </div>
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
                          {user.licenseNumber ? `License #${user.licenseNumber}` : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.licenseNumber ? (
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
                          {user.medicalClass ? `Class ${user.medicalClass}` : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.medicalClass ? (
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
        </Tabs>
      </div>
    </AppLayout>
  );
} 