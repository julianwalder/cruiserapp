import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { RobustVeriffService } from './robust-veriff-service';
import { WebhookMonitor } from './webhook-monitor';

// Enhanced webhook payload interface
export interface RobustVeriffWebhookPayload {
  id?: string;
  vendorData?: string;
  status?: string;
  action?: string;
  feature?: string;
  code?: number;
  attemptId?: string;
  endUserId?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // SelfID specific fields
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
  
  // Document fields
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
  
  // Traditional verification structure
  verification?: {
    id: string;
    status: string;
    person?: any;
    document?: any;
    additionalVerification?: any;
    decisionScore?: number;
    insights?: any;
    createdAt: string;
    updatedAt: string;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  userId?: string;
  sessionId?: string;
  action?: string;
  data?: any;
  error?: string;
  retryable?: boolean;
}

export class RobustVeriffWebhook {
  private static readonly WEBHOOK_SECRET = process.env.VERIFF_WEBHOOK_SECRET;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Validate webhook signature with enhanced security
   */
  static validateSignature(payload: string, signature: string): boolean {
    if (!this.WEBHOOK_SECRET) {
      console.error('❌ VERIFF_WEBHOOK_SECRET not configured');
      return false;
    }

    if (!signature) {
      console.error('❌ No signature provided in webhook');
      return false;
    }

    try {
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
        isValid,
        payloadLength: payload.length
      });

      return isValid;
    } catch (error) {
      console.error('❌ Error validating signature:', error);
      return false;
    }
  }

  /**
   * Process webhook with comprehensive error handling and validation
   */
  static async processWebhook(
    payload: RobustVeriffWebhookPayload,
    signature: string,
    headers: Record<string, string> = {}
  ): Promise<WebhookProcessingResult> {
    const webhookId = crypto.randomUUID();
    const startTime = Date.now();

    console.log('🔄 Processing Veriff webhook:', {
      webhookId,
      id: payload.id,
      feature: payload.feature,
      action: payload.action,
      status: payload.status,
      code: payload.code
    });

    // Log webhook event for monitoring
    await WebhookMonitor.logWebhookEvent({
      userId: payload.vendorData,
      eventType: 'received',
      webhookType: this.getWebhookType(payload),
      sessionId: payload.id,
      status: 'pending',
      payload,
      retryCount: 0,
    });

    try {
      // Validate payload structure
      const validationResult = this.validatePayload(payload);
      if (!validationResult.valid) {
        throw new Error(`Invalid webhook payload: ${validationResult.error}`);
      }

      // Determine user ID
      const userId = payload.vendorData || payload.verification?.id;
      if (!userId) {
        throw new Error('No user ID found in webhook payload');
      }

      console.log('👤 Processing webhook for user:', userId);

      // Process based on webhook type
      const result = await this.processWebhookByType(payload, userId, webhookId);

      // Mark webhook as successfully processed
      await WebhookMonitor.markWebhookProcessed(webhookId, true);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Webhook processed successfully in ${processingTime}ms:`, {
        webhookId,
        userId,
        action: result.action,
        sessionId: result.sessionId
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ Webhook processing failed after ${processingTime}ms:`, {
        webhookId,
        error: errorMessage,
        payload: {
          id: payload.id,
          action: payload.action,
          feature: payload.feature
        }
      });

      // Mark webhook as failed
      await WebhookMonitor.markWebhookProcessed(
        webhookId,
        false,
        errorMessage
      );

      return {
        success: false,
        message: 'Webhook processing failed',
        error: errorMessage,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Validate webhook payload structure
   */
  private static validatePayload(payload: RobustVeriffWebhookPayload): {
    valid: boolean;
    error?: string;
  } {
    if (!payload) {
      return { valid: false, error: 'Payload is null or undefined' };
    }

    if (!payload.id) {
      return { valid: false, error: 'Missing session ID' };
    }

    if (!payload.vendorData && !payload.verification?.id) {
      return { valid: false, error: 'Missing user identifier' };
    }

    if (!payload.action && !payload.status) {
      return { valid: false, error: 'Missing action or status' };
    }

    return { valid: true };
  }

  /**
   * Process webhook based on its type
   */
  private static async processWebhookByType(
    payload: RobustVeriffWebhookPayload,
    userId: string,
    webhookId: string
  ): Promise<WebhookProcessingResult> {
    const webhookType = this.getWebhookType(payload);
    const sessionId = payload.id!;

    console.log(`📋 Processing ${webhookType} webhook for session ${sessionId}`);

    switch (webhookType) {
      case 'submitted':
        return await this.processSubmittedWebhook(payload, userId, sessionId);
      
      case 'approved':
        return await this.processApprovedWebhook(payload, userId, sessionId);
      
      case 'declined':
        return await this.processDeclinedWebhook(payload, userId, sessionId);
      
      default:
        return await this.processUnknownWebhook(payload, userId, sessionId);
    }
  }

  /**
   * Process submitted webhook
   */
  private static async processSubmittedWebhook(
    payload: RobustVeriffWebhookPayload,
    userId: string,
    sessionId: string
  ): Promise<WebhookProcessingResult> {
    console.log('📝 Processing submitted webhook');

    const updateData = {
      veriffSessionId: sessionId,
      veriffStatus: 'submitted',
      veriffSubmittedAt: new Date().toISOString(),
      veriffWebhookData: payload,
      updatedAt: new Date().toISOString(),
    };

    await this.updateUserVerificationData(userId, updateData);

    return {
      success: true,
      message: 'Verification submitted successfully',
      userId,
      sessionId,
      action: 'submitted'
    };
  }

  /**
   * Process approved webhook with comprehensive data sync
   */
  private static async processApprovedWebhook(
    payload: RobustVeriffWebhookPayload,
    userId: string,
    sessionId: string
  ): Promise<WebhookProcessingResult> {
    console.log('✅ Processing approved webhook');

    try {
      // First, update with webhook data
      const webhookUpdateData = {
        veriffSessionId: sessionId,
        veriffStatus: 'approved',
        identityVerified: true,
        identityVerifiedAt: new Date().toISOString(),
        veriffApprovedAt: new Date().toISOString(),
        veriffWebhookData: payload,
        updatedAt: new Date().toISOString(),
      };

      await this.updateUserVerificationData(userId, webhookUpdateData);

      // Then, sync comprehensive data from Veriff API
      console.log('🔄 Syncing comprehensive data from Veriff API...');
      const syncResult = await RobustVeriffService.syncUserVerificationData(userId, sessionId);

      if (syncResult.success) {
        console.log('✅ Comprehensive data sync completed');
        
        // Log successful verification
        await this.logVerificationActivity(userId, 'approved', {
          sessionId,
          hasPersonData: !!syncResult.data?.person,
          hasDecisionData: !!syncResult.data?.decision,
          decisionScore: syncResult.data?.decision?.decisionScore
        });

        return {
          success: true,
          message: 'Verification approved and data synced',
          userId,
          sessionId,
          action: 'approved',
          data: syncResult.data
        };
      } else {
        console.warn('⚠️ API sync failed, but webhook data was processed:', syncResult.error);
        
        return {
          success: true,
          message: 'Verification approved (webhook data only)',
          userId,
          sessionId,
          action: 'approved',
          data: { webhookOnly: true, syncError: syncResult.error }
        };
      }

    } catch (error) {
      console.error('❌ Error processing approved webhook:', error);
      throw error;
    }
  }

  /**
   * Process declined webhook
   */
  private static async processDeclinedWebhook(
    payload: RobustVeriffWebhookPayload,
    userId: string,
    sessionId: string
  ): Promise<WebhookProcessingResult> {
    console.log('❌ Processing declined webhook');

    const updateData = {
      veriffSessionId: sessionId,
      veriffStatus: 'declined',
      identityVerified: false,
      veriffDeclinedAt: new Date().toISOString(),
      veriffWebhookData: payload,
      updatedAt: new Date().toISOString(),
    };

    await this.updateUserVerificationData(userId, updateData);

    // Log declined verification
    await this.logVerificationActivity(userId, 'declined', {
      sessionId,
      reason: payload.status || payload.action
    });

    return {
      success: true,
      message: 'Verification declined',
      userId,
      sessionId,
      action: 'declined'
    };
  }

  /**
   * Process unknown webhook type
   */
  private static async processUnknownWebhook(
    payload: RobustVeriffWebhookPayload,
    userId: string,
    sessionId: string
  ): Promise<WebhookProcessingResult> {
    console.log('❓ Processing unknown webhook type');

    const updateData = {
      veriffSessionId: sessionId,
      veriffStatus: payload.status || payload.action || 'unknown',
      veriffWebhookData: payload,
      updatedAt: new Date().toISOString(),
    };

    await this.updateUserVerificationData(userId, updateData);

    return {
      success: true,
      message: 'Unknown webhook processed',
      userId,
      sessionId,
      action: 'unknown'
    };
  }

  /**
   * Update user verification data in database
   */
  private static async updateUserVerificationData(
    userId: string,
    updateData: any
  ): Promise<void> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('💾 Updating user verification data:', {
      userId,
      fields: Object.keys(updateData)
    });

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('❌ Error updating user verification data:', error);
      throw new Error(`Failed to update user verification data: ${error.message}`);
    }

    console.log('✅ User verification data updated successfully');
  }

  /**
   * Log verification activity
   */
  private static async logVerificationActivity(
    userId: string,
    action: string,
    details: any
  ): Promise<void> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const activityData = {
      userId,
      action: `verification_${action}`,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('activity_log')
      .insert(activityData);

    if (error) {
      console.error('❌ Error logging verification activity:', error);
    } else {
      console.log('📝 Verification activity logged successfully');
    }
  }

  /**
   * Determine webhook type from payload
   */
  private static getWebhookType(payload: RobustVeriffWebhookPayload): 'submitted' | 'approved' | 'declined' | 'unknown' {
    const action = payload.action || payload.status;
    
    if (action === 'submitted') {
      return 'submitted';
    } else if (action === 'approved') {
      return 'approved';
    } else if (action === 'declined') {
      return 'declined';
    }
    
    return 'unknown';
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network errors are retryable
      if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        return true;
      }
      
      // Database connection errors are retryable
      if (message.includes('database') || message.includes('connection')) {
        return true;
      }
      
      // Temporary API errors are retryable
      if (message.includes('temporary') || message.includes('unavailable')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Retry webhook processing with exponential backoff
   */
  static async retryWebhookProcessing(
    payload: RobustVeriffWebhookPayload,
    signature: string,
    retryCount: number = 0
  ): Promise<WebhookProcessingResult> {
    if (retryCount >= this.MAX_RETRIES) {
      return {
        success: false,
        message: 'Max retries exceeded',
        error: 'Webhook processing failed after maximum retries',
        retryable: false
      };
    }

    console.log(`🔄 Retrying webhook processing (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);

    // Wait with exponential backoff
    const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await this.processWebhook(payload, signature);
    } catch (error) {
      if (this.isRetryableError(error) && retryCount < this.MAX_RETRIES - 1) {
        return await this.retryWebhookProcessing(payload, signature, retryCount + 1);
      }
      
      throw error;
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
        veriffStatus,
        identityVerified,
        veriffPersonGivenName,
        veriffPersonLastName,
        veriffPersonIdNumber,
        veriffPersonDateOfBirth,
        veriffPersonNationality,
        veriffPersonGender,
        veriffDocumentType,
        veriffDocumentNumber,
        veriffDocumentCountry,
        veriffDecisionScore,
        veriffApprovedAt,
        veriffDeclinedAt,
        veriffWebhookData,
        updatedAt
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

    return {
      sessionId: user.veriffSessionId,
      status: user.veriffStatus,
      isVerified: user.identityVerified,
      person: {
        givenName: user.veriffPersonGivenName,
        lastName: user.veriffPersonLastName,
        idNumber: user.veriffPersonIdNumber,
        dateOfBirth: user.veriffPersonDateOfBirth,
        nationality: user.veriffPersonNationality,
        gender: user.veriffPersonGender,
      },
      document: {
        type: user.veriffDocumentType,
        number: user.veriffDocumentNumber,
        country: user.veriffDocumentCountry,
      },
      decisionScore: user.veriffDecisionScore,
      approvedAt: user.veriffApprovedAt,
      declinedAt: user.veriffDeclinedAt,
      webhookData: user.veriffWebhookData,
      lastUpdated: user.updatedAt,
    };
  }
}


