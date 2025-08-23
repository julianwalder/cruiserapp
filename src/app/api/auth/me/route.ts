import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { UUID } from '@/types/uuid-types';


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if this is an impersonation token
    const isImpersonation = AuthService.isImpersonationToken(token);
    const originalUserId = AuthService.getOriginalUserId(token);
    
    console.log('🔍 /api/auth/me - Token info:', {
      userId: decoded.userId,
      isImpersonation,
      originalUserId,
      tokenPreview: token.substring(0, 20) + '...'
    });

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get user data with roles
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        "totalFlightHours",
        "licenseNumber",
        "medicalClass",
        "instructorRating",
        "lastLoginAt",
        "createdAt",
        "updatedAt",
        "avatarUrl",
        phone,
        "personalNumber",
        "veriffPersonIdNumber",
        "identityVerified",
        "identityVerifiedAt",
        "veriffSessionId",
        "veriffVerificationId",
        "veriffStatus",
        "veriffPersonGivenName",
        "veriffPersonLastName",
        "veriffPersonIdNumber",
        "veriffPersonDateOfBirth",
        "veriffPersonNationality",
        "veriffPersonGender",
        "veriffPersonCountry",
        "veriffDocumentType",
        "veriffDocumentNumber",
        "veriffDocumentCountry",
        "veriffDocumentValidFrom",
        "veriffDocumentValidUntil",
        "veriffDocumentIssuedBy",
        "veriffFaceMatchSimilarity",
        "veriffFaceMatchStatus",
        "veriffDecisionScore",
        "veriffQualityScore",
        "veriffFlags",
        "veriffContext",
        "veriffAttemptId",
        "veriffFeature",
        "veriffCode",
        "veriffReason",
        "veriffCreatedAt",
        "veriffUpdatedAt",
        "veriffSubmittedAt",
        "veriffApprovedAt",
        "veriffDeclinedAt",
        "veriffWebhookReceivedAt",
        "veriffWebhookData",
        address,
        city,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get normalized address data
    const { data: normalizedAddress, error: addressError } = await supabase
      .from('normalized_addresses')
      .select('*')
      .eq('user_id', decoded.userId)
      .single();

    if (addressError && addressError.code !== 'PGRST116') {
      console.error('Error fetching normalized address:', addressError);
    }

    // Extract roles from user_roles
    const roles = user.user_roles.map((ur: any) => ur.roles.name);

    // Return user data with roles array and normalized address
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userRoles: user.user_roles, // Keep userRoles for frontend compatibility
      roles: roles,
      status: user.status,
      totalFlightHours: user.totalFlightHours || 0,
      licenseNumber: user.licenseNumber,
      medicalClass: user.medicalClass,
      instructorRating: user.instructorRating,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      personalNumber: user.personalNumber,
      veriffPersonIdNumber: user.veriffPersonIdNumber,
      identityVerified: user.identityVerified || false,
      identityVerifiedAt: user.identityVerifiedAt,
      // All verification fields
      veriffSessionId: user.veriffSessionId,
      veriffVerificationId: user.veriffVerificationId,
      veriffStatus: user.veriffStatus,
      veriffPersonGivenName: user.veriffPersonGivenName,
      veriffPersonLastName: user.veriffPersonLastName,
      veriffPersonIdNumber: user.veriffPersonIdNumber,
      veriffPersonDateOfBirth: user.veriffPersonDateOfBirth,
      veriffPersonNationality: user.veriffPersonNationality,
      veriffPersonGender: user.veriffPersonGender,
      veriffPersonCountry: user.veriffPersonCountry,
      veriffDocumentType: user.veriffDocumentType,
      veriffDocumentNumber: user.veriffDocumentNumber,
      veriffDocumentCountry: user.veriffDocumentCountry,
      veriffDocumentValidFrom: user.veriffDocumentValidFrom,
      veriffDocumentValidUntil: user.veriffDocumentValidUntil,
      veriffDocumentIssuedBy: user.veriffDocumentIssuedBy,
      veriffFaceMatchSimilarity: user.veriffFaceMatchSimilarity,
      veriffFaceMatchStatus: user.veriffFaceMatchStatus,
      veriffDecisionScore: user.veriffDecisionScore,
      veriffQualityScore: user.veriffQualityScore,
      veriffFlags: user.veriffFlags,
      veriffContext: user.veriffContext,
      veriffAttemptId: user.veriffAttemptId,
      veriffFeature: user.veriffFeature,
      veriffCode: user.veriffCode,
      veriffReason: user.veriffReason,
      veriffCreatedAt: user.veriffCreatedAt,
      veriffUpdatedAt: user.veriffUpdatedAt,
      veriffSubmittedAt: user.veriffSubmittedAt,
      veriffApprovedAt: user.veriffApprovedAt,
      veriffDeclinedAt: user.veriffDeclinedAt,
      veriffWebhookReceivedAt: user.veriffWebhookReceivedAt,
      veriffWebhookData: user.veriffWebhookData,
      address: user.address,
      city: user.city,
      // Impersonation data
      isImpersonation,
      originalUserId,
      // Normalized address data
      normalizedAddress: normalizedAddress ? {
        streetAddress: normalizedAddress.street_address,
        city: normalizedAddress.city,
        stateRegion: normalizedAddress.state_region,
        country: normalizedAddress.country,
        postalCode: normalizedAddress.postal_code,
        phone: normalizedAddress.phone,
        cnp: normalizedAddress.cnp,
        confidenceScore: normalizedAddress.confidence_score,
        processingNotes: normalizedAddress.processing_notes,
        sourceType: normalizedAddress.source_type,
        createdAt: normalizedAddress.created_at,
        updatedAt: normalizedAddress.updated_at
      } : null
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 