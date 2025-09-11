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
  BookOpen,
  Radio
} from 'lucide-react';
import { User as UserType } from '@/types/uuid-types';
import { cn } from '@/lib/utils';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { UnifiedIdentityVerification } from '@/components/ui/unified-identity-verification';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { PilotLicenseUpload } from '@/components/PilotLicenseUpload';
import { MedicalCertificateUpload } from '@/components/MedicalCertificateUpload';
import { RadioCertificateUpload } from '@/components/RadioCertificateUpload';

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
  zipCode?: string;
  // Normalized address data
  normalizedAddress?: {
    streetAddress?: string;
    city?: string;
    stateRegion?: string;
    country?: string;
    zipCode?: string;
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
  const [medicalCertificates, setMedicalCertificates] = useState<any[]>([]);
  const [radioCertificates, setRadioCertificates] = useState<any[]>([]);
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
        
        // Combine licenses with their associated documents
        const licensesWithDocuments = (data.licenses || []).map((license: any) => {
          const associatedDocument = (data.documents || []).find((doc: any) => doc.id === license.document_id);
          return {
            ...license,
            pilot_documents: associatedDocument ? [associatedDocument] : []
          };
        });
        
        setPilotLicenses(licensesWithDocuments);
      }

      // Fetch medical certificates
      const certificatesResponse = await fetch('/api/my-account/medical-certificates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (certificatesResponse.ok) {
        const certificatesData = await certificatesResponse.json();
        const certificatesWithDocuments = (certificatesData.certificates || []).map((certificate: any) => {
          const associatedDocument = (certificatesData.documents || []).find((doc: any) => doc.id === certificate.document_id);
          return {
            ...certificate,
            pilot_documents: associatedDocument ? [associatedDocument] : []
          };
        });
        setMedicalCertificates(certificatesWithDocuments);
      }

      // Fetch radio certificates
      const radioCertificatesResponse = await fetch('/api/my-account/radio-certificates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (radioCertificatesResponse.ok) {
        const radioCertificatesData = await radioCertificatesResponse.json();
        const radioCertificatesWithDocuments = (radioCertificatesData.radioCertificates || []).map((certificate: any) => {
          const associatedDocument = (radioCertificatesData.documents || []).find((doc: any) => doc.id === certificate.document_id);
          return {
            ...certificate,
            pilot_documents: associatedDocument ? [associatedDocument] : []
          };
        });
        setRadioCertificates(radioCertificatesWithDocuments);
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
          const verificationResponse = await fetch(`/api/stripe-identity/verification-data/${userData.id}`, {
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

  // Helper function to get the earliest expiration date from pilot license ratings and language proficiency
  const getEarliestExpirationDate = (license: any) => {
    const allDates: Date[] = [];

    // Check class type ratings
    if (license?.class_type_ratings && Array.isArray(license.class_type_ratings)) {
      const ratingDates = license.class_type_ratings
        .filter((rating: any) => rating.validUntil)
        .map((rating: any) => new Date(rating.validUntil))
        .filter((date: Date) => !isNaN(date.getTime()));
      allDates.push(...ratingDates);
    }

    // Check language proficiency
    if (license?.language_proficiency && Array.isArray(license.language_proficiency)) {
      const languageDates = license.language_proficiency
        .filter((lang: any) => lang.validityExpiry)
        .map((lang: any) => new Date(lang.validityExpiry))
        .filter((date: Date) => !isNaN(date.getTime()));
      allDates.push(...languageDates);
    }

    if (allDates.length === 0) {
      return null;
    }

    return new Date(Math.min(...allDates.map((date: Date) => date.getTime())));
  };

  // Helper function to get validation status and color
  const getValidationStatus = (license: any) => {
    const expirationDate = getEarliestExpirationDate(license);
    if (!expirationDate) {
      return { status: 'No expiration', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }

    const now = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return { 
        status: 'Expired', 
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        days: Math.abs(daysUntilExpiration)
      };
    } else if (daysUntilExpiration <= 30) {
      return { 
        status: 'Expires soon', 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-100',
        days: daysUntilExpiration
      };
    } else {
      return { 
        status: 'Valid', 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        days: daysUntilExpiration
      };
    }
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

    // Check if user is verified (either from Stripe Identity or legacy Veriff)
    if (verificationData.isVerified || verificationData.status === 'verified') {
      return <ShieldCheck className="h-5 w-5 text-green-600" />;
    }

    const status = verificationData.status?.toLowerCase();
    switch (status) {
      case 'verified':
        return <ShieldCheck className="h-5 w-5 text-green-600" />;
      case 'canceled':
        return <ShieldAlert className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'requires_input':
        return <ShieldAlert className="h-5 w-5 text-blue-600" />;
      case 'approved': // Legacy Veriff status
        return <ShieldCheck className="h-5 w-5 text-green-600" />;
      case 'declined': // Legacy Veriff status
        return <ShieldAlert className="h-5 w-5 text-red-600" />;
      case 'pending': // Legacy Veriff status
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  const getVerificationShieldTooltip = () => {
    if (!verificationData) {
      return 'Identity verification not started';
    }

    // Check if user is verified (either from Stripe Identity or legacy Veriff)
    if (verificationData.isVerified || verificationData.status === 'verified') {
      return 'Identity verified and approved';
    }

    const status = verificationData.status?.toLowerCase();
    switch (status) {
      case 'verified':
        return 'Identity verified and approved';
      case 'canceled':
        return 'Identity verification canceled';
      case 'processing':
        return 'Identity verification in progress';
      case 'requires_input':
        return 'Identity verification requires input';
      case 'approved': // Legacy Veriff status
        return 'Identity verified and approved';
      case 'declined': // Legacy Veriff status
        return 'Identity verification declined';
      case 'pending': // Legacy Veriff status
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
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center space-x-4">
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
            <div className="flex-1 flex flex-col justify-center min-h-[96px] min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-lg font-bold">
                  {user.firstName} {user.lastName}
                </h1>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {user.userRoles?.map((userRole, index) => (
                  <Badge 
                    key={`${userRole.roles.name}-${index}`} 
                    className={cn("text-xs flex-shrink-0", getRoleBadgeColor(userRole.roles.name))}
                  >
                    {getRoleDisplayName(userRole.roles.name)}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Status Section */}
            <div className="flex-shrink-0 text-right flex flex-col justify-center min-h-[96px] items-end w-32">
                {/* Verification Status */}
              <div className="mb-2 self-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-end">
                        {getVerificationShieldIcon()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getVerificationShieldTooltip()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Badge 
                variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                className="mb-2 self-end text-xs"
              >
                {user.status === 'ACTIVE' ? 'Active' : user.status}
              </Badge>
              <p className="text-sm text-muted-foreground self-end">
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
                    <p className="text-sm text-muted-foreground">{user.normalizedAddress.zipCode || 'Not provided'}</p>
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
                  <p className="text-sm text-muted-foreground">{user.zipCode || 'Not provided'}</p>
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
          <div className="space-y-6">
            {/* Stripe Identity Verification Component */}
            <UnifiedIdentityVerification
              userId={user.id}
              userData={{
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
              }}
              onStatusChange={async (status) => {
                console.log('Identity verification status changed to:', status);
                // Refresh verification data to update the shield icon
                try {
                  const token = localStorage.getItem('token');
                  if (token) {
                    const verificationResponse = await fetch(`/api/stripe-identity/verification-data/${user.id}`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                    });
                    if (verificationResponse.ok) {
                      const verificationResult = await verificationResponse.json();
                      if (verificationResult.success && verificationResult.data) {
                        setVerificationData(verificationResult.data);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error refreshing verification data:', error);
                }
              }}
            />

            {/* Only show explanatory cards if user is not verified */}
            {(!verificationData?.isVerified && verificationData?.status !== 'verified') && (
              <>
                {/* Verification Benefits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Why Verify Your Identity?
                    </CardTitle>
                    <CardDescription>
                      Identity verification helps us provide you with the best possible service
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Enhanced Security</h4>
                          <p className="text-sm text-muted-foreground">
                            Protect your account and personal information with verified identity
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Zap className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Faster Processing</h4>
                          <p className="text-sm text-muted-foreground">
                            Expedited service and faster approval for all your requests
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Award className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Full Access</h4>
                          <p className="text-sm text-muted-foreground">
                            Unlock all platform features and premium services
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Compliance Ready</h4>
                          <p className="text-sm text-muted-foreground">
                            Meet all regulatory requirements for aviation services
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Verification Process Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      How It Works
                    </CardTitle>
                    <CardDescription>
                      Our secure identity verification process is quick and easy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          1
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Prepare Your Documents</h4>
                          <p className="text-sm text-muted-foreground">
                            Have your government-issued ID (passport, driver's license, or national ID) ready
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          2
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Take Photos</h4>
                          <p className="text-sm text-muted-foreground">
                            Use your device's camera to capture clear photos of your ID and a selfie
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          3
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Instant Verification</h4>
                          <p className="text-sm text-muted-foreground">
                            Our secure system verifies your identity in real-time using advanced technology
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                          ✓
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">You're All Set!</h4>
                          <p className="text-sm text-muted-foreground">
                            Once verified, you'll have full access to all platform features
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
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
                <div className="space-y-3">
                  {/* Active License */}
                  {pilotLicenses.filter(l => l.status === 'active').length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Award className="h-5 w-5 text-green-600" />
                        <div className="min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="font-medium">Active Pilot License</h4>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {pilotLicenses.filter(l => l.status === 'active')[0].license_type} - {pilotLicenses.filter(l => l.status === 'active')[0].license_number}
                          </p>
                          {(() => {
                            const activeLicense = pilotLicenses.filter(l => l.status === 'active')[0];
                            const validation = getValidationStatus(activeLicense);
                            const expirationDate = getEarliestExpirationDate(activeLicense);
                            return (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                                  v{pilotLicenses.filter(l => l.status === 'active')[0].version}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`${validation.bgColor} ${validation.color} border-current`}
                                >
                                  {validation.status}
                                  {validation.days !== undefined && (
                                    <span className="ml-1">
                                      {validation.status === 'Expired' ? `(${validation.days}d ago)` : 
                                       validation.status === 'Expires soon' ? `(${validation.days}d)` : 
                                       `(${validation.days}d)`}
                                    </span>
                                  )}
                                </Badge>
                                {expirationDate && (
                                  <span className="text-xs text-muted-foreground">
                                    Valid until: {formatDate(expirationDate.toISOString())}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                        <Badge variant="default">Active</Badge>
                        <PilotLicenseUpload 
                          existingLicense={pilotLicenses.filter(l => l.status === 'active')[0]}
                          onLicenseUploaded={(license) => {
                            setPilotLicenses([license, ...pilotLicenses.filter(l => l.id !== license.id)]);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expired/Archived Licenses */}
                  {pilotLicenses.filter(l => l.status !== 'active').length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Pilot License History
                      </h5>
                      {pilotLicenses.filter(l => l.status !== 'active').map((license) => (
                        <div key={license.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-gray-50 border-gray-200 gap-4">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div className="min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-medium text-sm">{license.license_type} - {license.license_number}</h4>
                                <div className="flex gap-2 self-start">
                                <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                                  v{license.version}
                                </Badge>
                                <Badge variant="outline" className={
                                  license.status === 'expired' 
                                    ? 'bg-red-100 text-red-700 border-red-300' 
                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                                }>
                                  {license.status === 'expired' ? 'Expired' : 'Archived'}
                                </Badge>
                              </div>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {license.status === 'expired' 
                                  ? 'Automatically expired' 
                                  : license.status === 'archived'
                                  ? (license.archive_reason || 'Manually archived')
                                  : 'Active license'}
                                {license.archived_at && (
                                  <span className="ml-2">
                                    • {formatDate(license.archived_at)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                            <PilotLicenseUpload 
                              existingLicense={license}
                              onLicenseUploaded={(updatedLicense) => {
                                setPilotLicenses([updatedLicense, ...pilotLicenses.filter(l => l.id !== updatedLicense.id)]);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Licenses */}
                  {pilotLicenses.length === 0 && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Award className="h-5 w-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium">Pilot License</h4>
                          <p className="text-sm text-muted-foreground">Not uploaded</p>
                        </div>
                      </div>
                      <PilotLicenseUpload 
                        onLicenseUploaded={(license) => {
                          setPilotLicenses([license, ...pilotLicenses]);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Medical Certificate */}
                <div className="space-y-4">
                  {/* Active Medical Certificate */}
                  {medicalCertificates.filter(c => c.status === 'active' && new Date(c.valid_until) > new Date()).length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <FileText className="h-5 w-5 text-green-600" />
                        <div className="min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="font-medium">Active Medical Certificate</h4>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {medicalCertificates.filter(c => c.status === 'active')[0].medical_class} - {medicalCertificates.filter(c => c.status === 'active')[0].certificate_number}
                          </p>
                          {(() => {
                            const activeCertificate = medicalCertificates.filter(c => c.status === 'active')[0];
                            const expirationDate = new Date(activeCertificate.valid_until);
                            const isExpiringSoon = expirationDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000; // 30 days
                            const isExpired = expirationDate < new Date();
                            
                            return (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                                  v{medicalCertificates.filter(c => c.status === 'active')[0].version}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    isExpired ? "bg-red-100 text-red-700 border-red-300" :
                                    isExpiringSoon ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                                    "bg-green-100 text-green-700 border-green-300"
                                  )}
                                >
                                  {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Valid until: {formatDate(expirationDate.toISOString())}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                        <Badge variant="default">Active</Badge>
                        <MedicalCertificateUpload 
                          existingCertificate={medicalCertificates.filter(c => c.status === 'active')[0]}
                          onCertificateUploaded={(certificate) => {
                            setMedicalCertificates([certificate, ...medicalCertificates.filter(c => c.id !== certificate.id)]);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expired/Archived Medical Certificates */}
                  {medicalCertificates.filter(c => c.status !== 'active' || new Date(c.valid_until) <= new Date()).length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Medical Certificate History
                      </h5>
                      {medicalCertificates.filter(c => c.status !== 'active' || new Date(c.valid_until) <= new Date()).map((certificate) => (
                        <div key={certificate.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-gray-50 border-gray-200 gap-4">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div className="min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-medium text-sm">{certificate.medical_class} - {certificate.certificate_number}</h4>
                                <div className="flex gap-2 self-start">
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                                    v{certificate.version}
                                  </Badge>
                                  <Badge variant="outline" className={
                                    certificate.status === 'expired' || new Date(certificate.valid_until) <= new Date()
                                      ? 'bg-red-100 text-red-700 border-red-300' 
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  }>
                                    {certificate.status === 'expired' || new Date(certificate.valid_until) <= new Date() ? 'Expired' : 'Archived'}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {certificate.status === 'expired' || new Date(certificate.valid_until) <= new Date()
                                  ? `Automatically expired • ${formatDate(certificate.valid_until)}`
                                  : certificate.status === 'archived'
                                  ? (certificate.archive_reason || 'Manually archived')
                                  : 'Active certificate'}
                                {certificate.archived_at && certificate.status === 'archived' && (
                                  <span className="ml-2">
                                    • {formatDate(certificate.archived_at)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                            <MedicalCertificateUpload 
                              existingCertificate={certificate}
                              onCertificateUploaded={(updatedCertificate) => {
                                setMedicalCertificates([updatedCertificate, ...medicalCertificates.filter(c => c.id !== updatedCertificate.id)]);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Medical Certificates */}
                  {medicalCertificates.filter(c => c.status === 'active' && new Date(c.valid_until) > new Date()).length === 0 && 
                   medicalCertificates.filter(c => c.status !== 'active' || new Date(c.valid_until) <= new Date()).length === 0 && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <h4 className="font-medium">Medical Certificate</h4>
                          <p className="text-sm text-muted-foreground">Not uploaded</p>
                        </div>
                      </div>
                      <MedicalCertificateUpload 
                        onCertificateUploaded={(certificate) => {
                          setMedicalCertificates([certificate, ...medicalCertificates]);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Radio Certificate */}
                <div className="space-y-4">
                  {/* Active Radio Certificate */}
                  {radioCertificates.filter(c => c.status === 'active' && new Date(c.valid_until) > new Date()).length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Radio className="h-5 w-5 text-green-600" />
                        <div className="min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="font-medium">Active Radio Certificate</h4>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {radioCertificates.filter(c => c.status === 'active')[0].certificate_number}
                          </p>
                          {(() => {
                            const activeCertificate = radioCertificates.filter(c => c.status === 'active')[0];
                            const expirationDate = new Date(activeCertificate.valid_until);
                            const isExpiringSoon = expirationDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000; // 30 days
                            const isExpired = expirationDate < new Date();
                            
                            return (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                                  v{radioCertificates.filter(c => c.status === 'active')[0].version}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    isExpired ? "bg-red-100 text-red-700 border-red-300" :
                                    isExpiringSoon ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                                    "bg-green-100 text-green-700 border-green-300"
                                  )}
                                >
                                  {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Valid until: {formatDate(expirationDate.toISOString())}
                                </span>
                              </div>
                            );
                          })()}
                  </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                        <Badge variant="default">Active</Badge>
                        <RadioCertificateUpload 
                          existingCertificate={radioCertificates.filter(c => c.status === 'active')[0]}
                          onCertificateUploaded={(certificate) => {
                            setRadioCertificates([certificate, ...radioCertificates.filter(c => c.id !== certificate.id)]);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expired/Archived Radio Certificates */}
                  {radioCertificates.filter(c => c.status !== 'active' || new Date(c.valid_until) <= new Date()).length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Radio className="h-4 w-4" />
                        Radio Certificate History
                      </h5>
                      {radioCertificates.filter(c => c.status !== 'active' || new Date(c.valid_until) <= new Date()).map((certificate) => (
                        <div key={certificate.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-gray-50 border-gray-200 gap-4">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <Radio className="h-4 w-4 text-gray-500" />
                            <div className="min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-medium text-sm">{certificate.certificate_number}</h4>
                                <div className="flex gap-2 self-start">
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                                    v{certificate.version}
                                  </Badge>
                                  <Badge variant="outline" className={
                                    certificate.status === 'expired' || new Date(certificate.valid_until) <= new Date()
                                      ? 'bg-red-100 text-red-700 border-red-300' 
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  }>
                                    {certificate.status === 'expired' || new Date(certificate.valid_until) <= new Date() ? 'Expired' : 'Archived'}
                                  </Badge>
                  </div>
                </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {certificate.status === 'expired' || new Date(certificate.valid_until) <= new Date()
                                  ? `Automatically expired • ${formatDate(certificate.valid_until)}`
                                  : certificate.status === 'archived'
                                  ? (certificate.archive_reason || 'Manually archived')
                                  : 'Active certificate'}
                                {certificate.archived_at && certificate.status === 'archived' && (
                                  <span className="ml-2">
                                    • {formatDate(certificate.archived_at)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                            <RadioCertificateUpload 
                              existingCertificate={certificate}
                              onCertificateUploaded={(updatedCertificate) => {
                                setRadioCertificates([updatedCertificate, ...radioCertificates.filter(c => c.id !== updatedCertificate.id)]);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Radio Certificates */}
                  {radioCertificates.filter(c => c.status === 'active' && new Date(c.valid_until) > new Date()).length === 0 && 
                   radioCertificates.filter(c => c.status !== 'active' || new Date(c.valid_until) <= new Date()).length === 0 && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                        <Radio className="h-5 w-5 text-gray-400" />
                    <div>
                      <h4 className="font-medium">Radio Certificate</h4>
                          <p className="text-sm text-muted-foreground">Not uploaded</p>
                    </div>
                  </div>
                      <RadioCertificateUpload 
                        onCertificateUploaded={(certificate) => {
                          setRadioCertificates([certificate, ...radioCertificates]);
                        }}
                      />
                  </div>
                  )}
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