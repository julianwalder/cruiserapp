'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  ShieldCheck,
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
  Plus,
  CheckCircle,
  AlertTriangle,
  Info,
  Fingerprint,
  Camera,
  Award,
  Database,
  Activity,
  Zap,
  Plane,
  BookOpen
} from 'lucide-react';
import { User as UserType } from '@/types/uuid-types';
import { cn } from '@/lib/utils';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { VeriffVerification } from '@/components/ui/veriff-verification';
import { EnhancedVerificationDisplay } from '@/components/ui/enhanced-verification-display';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { PilotLicenseUpload } from '@/components/PilotLicenseUpload';

// Extended User interface for My Account with userRoles and verification data
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
  postalCode?: string;
  // Normalized address data
  normalizedAddress?: {
    streetAddress?: string;
    city?: string;
    stateRegion?: string;
    country?: string;
    postalCode?: string;
    phone?: string;
    cnp?: string;
    confidenceScore?: number;
    processingNotes?: string;
    sourceType?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  // Enhanced Veriff data fields
  veriffSessionId?: string;
  veriffVerificationId?: string;
  veriffStatus?: string;
  veriffPersonGivenName?: string;
  veriffPersonLastName?: string;
  veriffPersonIdNumber?: string;
  veriffPersonDateOfBirth?: string;
  veriffPersonNationality?: string;
  veriffPersonGender?: string;
  veriffPersonCountry?: string;
  veriffDocumentType?: string;
  veriffDocumentNumber?: string;
  veriffDocumentCountry?: string;
  veriffDocumentValidFrom?: string;
  veriffDocumentValidUntil?: string;
  veriffDocumentIssuedBy?: string;
  veriffFaceMatchSimilarity?: number;
  veriffFaceMatchStatus?: string;
  veriffDecisionScore?: number;
  veriffQualityScore?: string;
  veriffFlags?: string[];
  veriffContext?: string;
  veriffAttemptId?: string;
  veriffFeature?: string;
  veriffCode?: number;
  veriffReason?: string;
  veriffCreatedAt?: string;
  veriffUpdatedAt?: string;
  veriffSubmittedAt?: string;
  veriffApprovedAt?: string;
  veriffDeclinedAt?: string;
  veriffWebhookReceivedAt?: string;
  veriffWebhookData?: any;
  isVerified?: boolean; // Added for clarity in the UI
}

interface VerificationData {
  // Session and metadata
  sessionId?: string;
  verificationId?: string;
  status?: string;
  code?: number;
  action?: string;
  feature?: string;
  attemptId?: string;
  reason?: string;
  
  // Person data (nested object)
  person?: {
    givenName?: string;
    lastName?: string;
    idNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    gender?: string;
    country?: string;
    address?: string;
    city?: string;
  };
  
  // Document data (nested object)
  document?: {
    type?: string;
    number?: string;
    country?: string;
    validFrom?: string;
    validUntil?: string;
    issuedBy?: string;
  };
  
  // Verification results
  faceMatchSimilarity?: number;
  faceMatchStatus?: string;
  decisionScore?: number;
  qualityScore?: string;
  flags?: string[];
  context?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  declinedAt?: string;
  webhookReceivedAt?: string;
  
  // Raw data
  webhookData?: any;
  
  // Legacy fields for compatibility
  isVerified?: boolean;
  identityVerifiedAt?: string;
}

export default function MyAccountPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<MyAccountUser | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'STUDENT' | 'PILOT' | null>(null);
  const [showOnboardingSelection, setShowOnboardingSelection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pilot documents state
  const [pilotLicenses, setPilotLicenses] = useState<any[]>([]);
  const [pilotDocuments, setPilotDocuments] = useState<any[]>([]);
  const [loadingPilotData, setLoadingPilotData] = useState(false);
  
  // Use the proper date formatting system
  const { formatDate } = useDateFormatUtils();

  // Set initial active tab based on URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['personal', 'verification', 'credentials', 'documents'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Auto-show onboarding selection for prospects on page load
  useEffect(() => {
    if (user && hasRole('PROSPECT')) {
      // Small delay to ensure the page is fully loaded
      const timer = setTimeout(() => {
        setShowOnboardingSelection(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const fetchPilotData = async () => {
    try {
      setLoadingPilotData(true);
      // Check for impersonation token first, then fall back to regular token
      const impersonationToken = localStorage.getItem('impersonationToken');
      const token = impersonationToken || localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch('/api/my-account/pilot-documents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPilotDocuments(data.documents || []);
        setPilotLicenses(data.licenses || []);
      }
    } catch (error) {
      console.error('Failed to fetch pilot data:', error);
    } finally {
      setLoadingPilotData(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Check for impersonation token first, then fall back to regular token
        const impersonationToken = localStorage.getItem('impersonationToken');
        const token = impersonationToken || localStorage.getItem('token');
        if (!token) return;

        // Fetch user data
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);

          // Fetch verification data
          const verificationResponse = await fetch(`/api/veriff/verification-data/${userData.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (verificationResponse.ok) {
            const verificationResult = await verificationResponse.json();
            if (verificationResult.success && verificationResult.data) {
              setVerificationData(verificationResult.data);
            }
          } else {
            // Fallback: create verification data from user data
            if (userData.identityVerified || userData.veriffStatus) {
              const fallbackVerificationData = {
                sessionId: userData.veriffSessionId,
                verificationId: userData.veriffVerificationId,
                status: userData.veriffStatus || 'approved',
                code: userData.veriffCode,
                action: userData.veriffWebhookData?.action,
                feature: userData.veriffFeature,
                attemptId: userData.veriffAttemptId,
                reason: userData.veriffReason,
                
                person: {
                  givenName: userData.veriffPersonGivenName,
                  lastName: userData.veriffPersonLastName,
                  idNumber: userData.veriffPersonIdNumber,
                  dateOfBirth: userData.veriffPersonDateOfBirth,
                  nationality: userData.veriffPersonNationality,
                  gender: userData.veriffPersonGender,
                  country: userData.veriffPersonCountry,
                  address: userData.veriffWebhookData?.person?.address || userData.address,
                  city: userData.veriffWebhookData?.person?.city || userData.city,
                },
                
                document: {
                  type: userData.veriffDocumentType,
                  number: userData.veriffDocumentNumber,
                  country: userData.veriffDocumentCountry,
                  validFrom: userData.veriffDocumentValidFrom,
                  validUntil: userData.veriffDocumentValidUntil,
                  issuedBy: userData.veriffDocumentIssuedBy,
                },
                
                faceMatchSimilarity: userData.veriffFaceMatchSimilarity,
                faceMatchStatus: userData.veriffFaceMatchStatus,
                decisionScore: userData.veriffDecisionScore,
                qualityScore: userData.veriffQualityScore,
                flags: userData.veriffFlags,
                context: userData.veriffContext,
                
                createdAt: userData.veriffCreatedAt,
                updatedAt: userData.veriffUpdatedAt,
                submittedAt: userData.veriffSubmittedAt,
                approvedAt: userData.veriffApprovedAt,
                declinedAt: userData.veriffDeclinedAt,
                webhookReceivedAt: userData.veriffWebhookReceivedAt,
                
                webhookData: userData.veriffWebhookData,
                
                isVerified: userData.identityVerified,
                identityVerifiedAt: userData.veriffApprovedAt,
              };
              
              setVerificationData(fallbackVerificationData);
            }
          }

          // Fetch pilot documents data
          await fetchPilotData();
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
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

  const formatScore = (score?: number) => {
    return score ? `${Math.round(score * 100)}%` : 'N/A';
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'declined':
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'declined':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getVerificationShieldIcon = () => {
    if (!verificationData) {
      return <Shield className="h-5 w-5 text-gray-400" />;
    }

    const status = verificationData.status?.toLowerCase();
    switch (status) {
      case 'approved':
        return <ShieldCheck className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <ShieldAlert className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  const getVerificationShieldTooltip = () => {
    if (!verificationData) {
      return 'Identity verification not started';
    }

    const status = verificationData.status?.toLowerCase();
    switch (status) {
      case 'approved':
        return 'Identity verified and approved';
      case 'declined':
        return 'Identity verification declined';
      case 'pending':
        return 'Identity verification in progress';
      default:
        return 'Identity verification status unknown';
    }
  };

  const getActualStatus = () => {
    if (!verificationData) return 'Not Started';
    return verificationData.status || 'Unknown';
  };

  const handleStartOnboarding = (type: 'STUDENT' | 'PILOT') => {
    setOnboardingType(type);
    setShowOnboarding(true);
    setShowOnboardingSelection(false); // Close the selection modal
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingType(null);
    // Refresh user data
    window.location.reload();
  };

  const handleOnboardingCancel = () => {
    setShowOnboarding(false);
    setOnboardingType(null);
  };

  const handleCloseSelection = () => {
    setShowOnboardingSelection(false);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading account information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load account</h2>
          <p className="text-muted-foreground">Please try refreshing the page or contact support.</p>
        </div>
      </div>
    );
  }

  // Show onboarding flow if active
  if (showOnboarding && onboardingType) {
    return (
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
    );
  }

  return (
    <div className="space-y-6 mt-6">
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
                        {getVerificationShieldIcon()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getVerificationShieldTooltip()}</p>
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
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal Info</span>
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Verification</span>
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Credentials</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-6">
          {/* Basic Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <p className="text-sm text-muted-foreground">{user.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <p className="text-sm text-muted-foreground">{user.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">{user.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Member Since</label>
                  <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Identification */}
          {(user.personalNumber || user.veriffPersonIdNumber || user.normalizedAddress?.cnp) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" />
                  Personal Identification
                </CardTitle>
                <CardDescription>
                  Your official identification numbers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.normalizedAddress?.cnp && (
                    <div>
                      <label className="text-sm font-medium">CNP (from invoices)</label>
                      <p className="text-sm font-mono text-muted-foreground">{user.normalizedAddress.cnp}</p>
                    </div>
                  )}
                  {user.veriffPersonIdNumber && (
                    <div>
                      <label className="text-sm font-medium">ID Number (verified)</label>
                      <p className="text-sm font-mono text-muted-foreground">{user.veriffPersonIdNumber}</p>
                    </div>
                  )}
                  {user.personalNumber && (
                    <div>
                      <label className="text-sm font-medium">Personal Number</label>
                      <p className="text-sm font-mono text-muted-foreground">{user.personalNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Normalized Address Information */}
          {user.normalizedAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Normalized Address Information
                </CardTitle>
                <CardDescription>
                  AI-processed and standardized address data
                  {user.normalizedAddress.confidenceScore && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Confidence: {Math.round(user.normalizedAddress.confidenceScore * 100)}%
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Street Address</label>
                    <p className="text-sm text-muted-foreground">{user.normalizedAddress.streetAddress || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <p className="text-sm text-muted-foreground">{user.normalizedAddress.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">State/Region</label>
                    <p className="text-sm text-muted-foreground">{user.normalizedAddress.stateRegion || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Postal Code</label>
                    <p className="text-sm text-muted-foreground">{user.normalizedAddress.postalCode || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <p className="text-sm text-muted-foreground">{user.normalizedAddress.country || 'Not provided'}</p>
                  </div>
                  {user.normalizedAddress.phone && (
                    <div>
                      <label className="text-sm font-medium">Phone (from invoices)</label>
                      <p className="text-sm text-muted-foreground">{user.normalizedAddress.phone}</p>
                    </div>
                  )}
                </div>
                {user.normalizedAddress.processingNotes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <label className="text-sm font-medium text-blue-800">Verification & Processing Notes</label>
                    </div>
                    <div className="text-sm text-blue-700 whitespace-pre-line">{user.normalizedAddress.processingNotes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legacy Address Information (if no normalized address) */}
          {!user.normalizedAddress && (user.address || user.city || user.state || user.country) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <p className="text-sm text-muted-foreground">{user.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <p className="text-sm text-muted-foreground">{user.city || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">State/Province</label>
                  <p className="text-sm text-muted-foreground">{user.state || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Postal Code</label>
                  <p className="text-sm text-muted-foreground">{user.postalCode || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <p className="text-sm text-muted-foreground">{user.country || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          {verificationData && verificationData.isVerified ? (
            <EnhancedVerificationDisplay verificationData={verificationData} />
          ) : (
            <div className="space-y-6">
              {/* Verification Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-400" />
                    Identity Verification Status
                  </CardTitle>
                  <CardDescription>
                    Verify your identity to access all platform features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Not Verified</h3>
                        <p className="text-sm text-muted-foreground">
                          Your identity has not been verified yet
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Verification Required
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Start Verification Card */}
              <Card className="border-2 border-dashed border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <ShieldCheck className="h-5 w-5" />
                    Start Identity Verification
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Complete your identity verification to unlock all platform features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-gray-900 mb-2">What you'll need:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Government-issued ID (passport or national ID card)</li>
                      <li>• Device with camera for photo capture</li>
                      <li>• Good lighting for clear document photos</li>
                      <li>• Stable internet connection</li>
                    </ul>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <VeriffVerification
                      userId={user.id}
                      userData={{
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                      }}
                      onStatusChange={(status) => {
                        console.log('Verification status changed to:', status);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Benefits Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Benefits of Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Full Platform Access</h4>
                        <p className="text-sm text-muted-foreground">Access all features and services</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Enhanced Security</h4>
                        <p className="text-sm text-muted-foreground">Protect your account with verified identity</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Faster Processing</h4>
                        <p className="text-sm text-muted-foreground">Expedited service for verified users</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Compliance Ready</h4>
                        <p className="text-sm text-muted-foreground">Meet regulatory requirements</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Pilot Credentials
              </CardTitle>
              <CardDescription>
                Your pilot licenses and certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pilot License */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Pilot License</h4>
                      <p className="text-sm text-muted-foreground">
                        {pilotLicenses.length > 0 
                          ? `${pilotLicenses[0].licenseType} - ${pilotLicenses[0].licenseNumber}`
                          : 'Not uploaded'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {pilotLicenses.length > 0 ? (
                      <>
                        <Badge variant="default">Uploaded</Badge>
                        <PilotLicenseUpload 
                          existingLicense={pilotLicenses[0]}
                          onLicenseUploaded={(license) => {
                            setPilotLicenses([license, ...pilotLicenses.filter(l => l.id !== license.id)]);
                          }}
                        />
                      </>
                    ) : (
                      <PilotLicenseUpload 
                        onLicenseUploaded={(license) => {
                          setPilotLicenses([license, ...pilotLicenses]);
                        }}
                      />
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
    </div>
  );
} 