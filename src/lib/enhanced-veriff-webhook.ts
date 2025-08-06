import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { WebhookMonitor } from './webhook-monitor';

interface VeriffWebhookPayload {
  id?: string;
  vendorData?: string;
  status?: string;
  action?: string;
  feature?: string;
  code?: number;
  attemptId?: string;
  
  // Person data (from SelfID extraction)
  personGivenName?: string;
  personLastName?: string;
  personIdNumber?: string;
  personDateOfBirth?: string;
  personNationality?: string;
  personGender?: string;
  personCountry?: string;
  personAddress?: string;
  personCity?: string;
  personPostalCode?: string;
  personStreet?: string;
  personHouseNumber?: string;
  
  // Document data (from SelfID extraction)
  documentType?: string;
  documentNumber?: string;
  documentCountry?: string;
  documentValidFrom?: string;
  documentValidUntil?: string;
  documentIssuedBy?: string;
  
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
  
  // Traditional verification data
  verification?: {
    id: string;
    status: string;
    person?: {
      givenName: string;
      lastName: string;
      idNumber?: string;
      dateOfBirth?: string;
      nationality?: string;
      gender?: string;
      country?: string;
      address?: string;
      city?: string;
      postalCode?: string;
      street?: string;
      houseNumber?: string;
    };
    document?: {
      type: string;
      number: string;
      country: string;
      validFrom?: string;
      validUntil?: string;
      issuedBy?: string;
    };
    additionalVerification?: {
      faceMatch: {
        similarity: number;
        status: string;
      };
    };
    decisionScore?: number;
    insights?: {
      quality?: string;
      flags?: string[];
      context?: string;
    };
    createdAt: string;
    updatedAt: string;
  };
}

export class EnhancedVeriffWebhook {
  private static readonly WEBHOOK_SECRET = process.env.VERIFF_WEBHOOK_SECRET;

  /**
   * Validate webhook signature
   */
  static validateSignature(payload: string, signature: string): boolean {
    if (!this.WEBHOOK_SECRET) {
      console.error('❌ VERIFF_WEBHOOK_SECRET not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    console.log('🔐 Signature validation:', {
      expected: expectedSignature.substring(0, 20) + '...',
      received: signature.substring(0, 20) + '...',
      isValid
    });

    return isValid;
  }

  /**
   * Process webhook payload and update user verification data
   */
  static async processWebhook(payload: VeriffWebhookPayload, signature: string): Promise<void> {
    console.log('🔄 Processing Veriff webhook:', {
      id: payload.id,
      feature: payload.feature,
      action: payload.action,
      status: payload.status
    });

    // Determine user ID from webhook
    const userId = payload.vendorData || payload.verification?.id;
    if (!userId) {
      throw new Error('No user ID found in webhook payload');
    }

    console.log('👤 Processing webhook for user:', userId);

    // Log webhook event for monitoring
    const webhookEventId = crypto.randomUUID();
    await WebhookMonitor.logWebhookEvent({
      userId,
      eventType: 'received',
      webhookType: this.getWebhookType(payload),
      sessionId: payload.id,
      status: 'pending',
      payload,
      retryCount: 0,
    });

    try {
      // Extract verification data based on webhook type
      const verificationData = this.extractVerificationData(payload);
      
      // Update user verification data with comprehensive extraction
      await this.updateUserVerificationData(userId, verificationData);
      
      // Mark webhook as successfully processed
      await WebhookMonitor.markWebhookProcessed(webhookEventId, true);
      
      console.log('✅ Webhook processed successfully for user:', userId);
      console.log('📊 Personal data extracted and stored automatically');
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      
      // Mark webhook as failed
      await WebhookMonitor.markWebhookProcessed(
        webhookEventId, 
        false, 
        error instanceof Error ? error.message : String(error)
      );
      
      throw error;
    }
  }

  /**
   * Determine webhook type from payload
   */
  private static getWebhookType(payload: VeriffWebhookPayload): 'submitted' | 'approved' | 'declined' | 'unknown' {
    if (payload.action === 'submitted' || payload.status === 'submitted') {
      return 'submitted';
    } else if (payload.action === 'approved' || payload.status === 'approved') {
      return 'approved';
    } else if (payload.action === 'declined' || payload.status === 'declined') {
      return 'declined';
    }
    return 'unknown';
  }

  /**
   * Extract verification data from webhook payload with comprehensive data extraction
   */
  private static extractVerificationData(payload: VeriffWebhookPayload) {
    // Handle SelfID webhooks (new format) - This is where personal data comes from
    if (payload.feature === 'selfid') {
      return {
        // Session and metadata
        sessionId: payload.id,
        status: payload.status || payload.action,
        action: payload.action,
        feature: payload.feature,
        code: payload.code,
        attemptId: payload.attemptId,
        
        // Person data - Comprehensive extraction
        person: {
          givenName: payload.personGivenName,
          lastName: payload.personLastName,
          idNumber: payload.personIdNumber,
          dateOfBirth: payload.personDateOfBirth,
          nationality: payload.personNationality,
          gender: payload.personGender,
          country: payload.personCountry,
          address: payload.personAddress,
          city: payload.personCity,
          postalCode: payload.personPostalCode,
          street: payload.personStreet,
          houseNumber: payload.personHouseNumber,
        },
        
        // Document data - Comprehensive extraction
        document: {
          type: payload.documentType,
          number: payload.documentNumber,
          country: payload.documentCountry,
          validFrom: payload.documentValidFrom,
          validUntil: payload.documentValidUntil,
          issuedBy: payload.documentIssuedBy,
        },
        
        // Verification results
        additionalVerification: {
          faceMatch: {
            similarity: payload.faceMatchSimilarity,
            status: payload.faceMatchStatus,
          },
        },
        
        // Decision and insights
        decisionScore: payload.decisionScore,
        insights: {
          quality: payload.qualityScore,
          flags: payload.flags,
          context: payload.context,
        },
        
        // Timestamps
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        submittedAt: payload.submittedAt,
        approvedAt: payload.status === 'approved' ? new Date().toISOString() : undefined,
        
        // Raw webhook data
        webhookReceivedAt: new Date().toISOString(),
        rawPayload: payload,
      };
    }
    
    // Handle traditional verification webhooks
    if (payload.verification) {
      return {
        // Session and metadata
        sessionId: payload.id,
        status: payload.verification.status,
        action: payload.action,
        feature: payload.feature,
        code: payload.code,
        attemptId: payload.attemptId,
        
        // Person data - Comprehensive extraction
        person: payload.verification.person,
        
        // Document data - Comprehensive extraction
        document: payload.verification.document,
        
        // Verification results
        additionalVerification: payload.verification.additionalVerification,
        
        // Decision and insights
        decisionScore: payload.verification.decisionScore,
        insights: payload.verification.insights,
        
        // Timestamps
        createdAt: payload.verification.createdAt,
        updatedAt: payload.verification.updatedAt,
        submittedAt: payload.submittedAt,
        approvedAt: payload.verification.status === 'approved' ? new Date().toISOString() : undefined,
        
        // Raw webhook data
        webhookReceivedAt: new Date().toISOString(),
        rawPayload: payload,
      };
    }

    // Fallback for unknown webhook types
    return {
      sessionId: payload.id,
      status: payload.status,
      action: payload.action,
      feature: payload.feature,
      code: payload.code,
      attemptId: payload.attemptId,
      webhookReceivedAt: new Date().toISOString(),
      rawPayload: payload,
    };
  }

  /**
   * Update user verification data in database with comprehensive field mapping
   */
  private static async updateUserVerificationData(userId: string, verificationData: any): Promise<void> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('💾 Updating user verification data:', {
      userId,
      status: verificationData.status,
      hasPersonData: !!verificationData.person,
      hasDocumentData: !!verificationData.document,
      hasAddressData: !!verificationData.person?.address
    });

    const updateData: any = {
      // Session and metadata - CRITICAL: Always update these fields
      veriffSessionId: verificationData.sessionId,
      veriffStatus: verificationData.status,
      identityVerified: verificationData.status === 'approved',
      
      // Store comprehensive webhook data
      veriffWebhookData: verificationData,
      
      // Store individual person fields for easy access - CRITICAL: Always update these
      veriffPersonGivenName: verificationData.person?.givenName,
      veriffPersonLastName: verificationData.person?.lastName,
      veriffPersonIdNumber: verificationData.person?.idNumber,
      veriffPersonDateOfBirth: verificationData.person?.dateOfBirth,
      veriffPersonNationality: verificationData.person?.nationality,
      veriffPersonGender: verificationData.person?.gender,
      veriffPersonCountry: verificationData.person?.country,
      
      // Store document fields
      veriffDocumentType: verificationData.document?.type,
      veriffDocumentNumber: verificationData.document?.number,
      veriffDocumentCountry: verificationData.document?.country,
      veriffDocumentValidFrom: verificationData.document?.validFrom,
      veriffDocumentValidUntil: verificationData.document?.validUntil,
      veriffDocumentIssuedBy: verificationData.document?.issuedBy,
      
      // Store verification results
      veriffFaceMatchSimilarity: verificationData.additionalVerification?.faceMatch?.similarity,
      veriffFaceMatchStatus: verificationData.additionalVerification?.faceMatch?.status,
      veriffDecisionScore: verificationData.decisionScore,
      veriffQualityScore: verificationData.insights?.quality,
      veriffFlags: verificationData.insights?.flags,
      veriffContext: verificationData.insights?.context,
      
      // Metadata
      veriffAttemptId: verificationData.attemptId,
      veriffFeature: verificationData.feature,
      veriffCode: verificationData.code,
      veriffReason: verificationData.status,
      
      // Timestamps
      veriffCreatedAt: verificationData.createdAt,
      veriffUpdatedAt: verificationData.updatedAt,
      veriffSubmittedAt: verificationData.submittedAt,
      veriffApprovedAt: verificationData.approvedAt,
      veriffDeclinedAt: verificationData.status === 'declined' ? new Date().toISOString() : null,
      veriffWebhookReceivedAt: verificationData.webhookReceivedAt,
      
      updatedAt: new Date().toISOString(),
    };

    // If approved, set identityVerifiedAt
    if (verificationData.status === 'approved') {
      updateData.identityVerifiedAt = new Date().toISOString();
    }

    // Update address fields if available (for frontend display)
    if (verificationData.person?.address) {
      updateData.address = verificationData.person.address;
    }
    if (verificationData.person?.city) {
      updateData.city = verificationData.person.city;
    }
    if (verificationData.person?.postalCode) {
      updateData.postalCode = verificationData.person.postalCode;
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('❌ Error updating user verification data:', error);
      throw new Error(`Failed to update user verification data: ${error.message}`);
    }

    console.log('✅ User verification data updated successfully');
    console.log('📊 Personal data automatically extracted and stored');
    
    // Log activity
    await this.logActivity(userId, verificationData);
  }

  /**
   * Log verification activity
   */
  private static async logActivity(userId: string, verificationData: any): Promise<void> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const activityData = {
      userId,
      action: 'verification_updated',
      details: {
        status: verificationData.status,
        feature: verificationData.feature,
        hasPersonData: !!verificationData.person,
        hasDocumentData: !!verificationData.document,
        hasAddressData: !!verificationData.person?.address,
        documentType: verificationData.document?.type,
        documentCountry: verificationData.document?.country,
        personName: verificationData.person ? `${verificationData.person.givenName} ${verificationData.person.lastName}` : null,
        personIdNumber: verificationData.person?.idNumber,
      },
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('activity_log')
      .insert(activityData);

    if (error) {
      console.error('❌ Error logging activity:', error);
    } else {
      console.log('📝 Activity logged successfully');
    }
  }

  /**
   * Get comprehensive verification data for a user
   */
  static async getUserVerificationData(userId: string): Promise<any> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        veriffSessionId,
        veriffVerificationId,
        veriffStatus,
        identityVerified,
        veriffPersonGivenName,
        veriffPersonLastName,
        veriffPersonIdNumber,
        veriffPersonDateOfBirth,
        veriffPersonNationality,
        veriffPersonGender,
        veriffPersonCountry,
        veriffDocumentType,
        veriffDocumentNumber,
        veriffDocumentCountry,
        veriffDocumentValidFrom,
        veriffDocumentValidUntil,
        veriffDocumentIssuedBy,
        veriffFaceMatchSimilarity,
        veriffFaceMatchStatus,
        veriffDecisionScore,
        veriffQualityScore,
        veriffFlags,
        veriffContext,
        veriffAttemptId,
        veriffFeature,
        veriffCode,
        veriffReason,
        veriffCreatedAt,
        veriffUpdatedAt,
        veriffSubmittedAt,
        veriffApprovedAt,
        veriffDeclinedAt,
        veriffWebhookReceivedAt,
        veriffWebhookData,
        address,
        city,
        postalCode
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user verification data:', error);
      throw new Error(`Failed to fetch user verification data: ${error.message}`);
    }

    if (!user) {
      return null;
    }

    // Map database fields to frontend-friendly format
    const mappedData = {
      sessionId: user.veriffSessionId,
      verificationId: user.veriffVerificationId,
      status: user.veriffStatus || user.veriffWebhookData?.status,
      code: user.veriffCode,
      action: user.veriffWebhookData?.action,
      feature: user.veriffFeature,
      attemptId: user.veriffAttemptId,
      reason: user.veriffReason,
      
      person: {
        givenName: user.veriffPersonGivenName,
        lastName: user.veriffPersonLastName,
        idNumber: user.veriffPersonIdNumber,
        dateOfBirth: user.veriffPersonDateOfBirth,
        nationality: user.veriffPersonNationality,
        gender: user.veriffPersonGender,
        country: user.veriffPersonCountry,
        address: user.address,
        city: user.city,
        postalCode: user.postalCode,
      },
      
      document: {
        type: user.veriffDocumentType,
        number: user.veriffDocumentNumber,
        country: user.veriffDocumentCountry,
        validFrom: user.veriffDocumentValidFrom,
        validUntil: user.veriffDocumentValidUntil,
        issuedBy: user.veriffDocumentIssuedBy,
      },
      
      faceMatchSimilarity: user.veriffFaceMatchSimilarity,
      faceMatchStatus: user.veriffFaceMatchStatus,
      decisionScore: user.veriffDecisionScore,
      qualityScore: user.veriffQualityScore,
      flags: user.veriffFlags,
      context: user.veriffContext,
      
      createdAt: user.veriffCreatedAt,
      updatedAt: user.veriffUpdatedAt,
      submittedAt: user.veriffSubmittedAt,
      approvedAt: user.veriffApprovedAt,
      declinedAt: user.veriffDeclinedAt,
      webhookReceivedAt: user.veriffWebhookReceivedAt,
      
      webhookData: user.veriffWebhookData,
      
      // Legacy compatibility
      isVerified: user.identityVerified,
      identityVerifiedAt: user.veriffApprovedAt,
    };

    return mappedData;
  }

  /**
   * Get verification statistics
   */
  static async getVerificationStats(): Promise<any> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: stats, error } = await supabase
      .from('users')
      .select('veriffStatus, identityVerified, veriffDocumentType, veriffDocumentCountry')
      .not('veriffStatus', 'is', null);

    if (error) {
      console.error('❌ Error fetching verification stats:', error);
      throw new Error(`Failed to fetch verification stats: ${error.message}`);
    }

    const totalVerifications = stats.length;
    const approvedVerifications = stats.filter(u => u.identityVerified).length;
    const pendingVerifications = stats.filter(u => u.veriffStatus === 'submitted').length;
    const declinedVerifications = stats.filter(u => u.veriffStatus === 'declined').length;

    const documentTypes = stats.reduce((acc, user) => {
      const type = user.veriffDocumentType || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countries = stats.reduce((acc, user) => {
      const country = user.veriffDocumentCountry || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalVerifications,
      approved: approvedVerifications,
      pending: pendingVerifications,
      declined: declinedVerifications,
      approvalRate: totalVerifications > 0 ? (approvedVerifications / totalVerifications * 100).toFixed(1) : 0,
      documentTypes,
      countries,
    };
  }
} 