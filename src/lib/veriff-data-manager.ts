import { createClient } from '@supabase/supabase-js';
import { VeriffService } from './veriff-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface VeriffDataManagerConfig {
  enableRealTimeSync?: boolean;
  autoRetryFailedWebhooks?: boolean;
  maxRetryAttempts?: number;
  syncInterval?: number; // in milliseconds
}

export class VeriffDataManager {
  private static instance: VeriffDataManager;
  private config: VeriffDataManagerConfig;
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor(config: VeriffDataManagerConfig = {}) {
    this.config = {
      enableRealTimeSync: true,
      autoRetryFailedWebhooks: true,
      maxRetryAttempts: 3,
      syncInterval: 30000, // 30 seconds
      ...config
    };
  }

  public static getInstance(config?: VeriffDataManagerConfig): VeriffDataManager {
    if (!VeriffDataManager.instance) {
      VeriffDataManager.instance = new VeriffDataManager(config);
    }
    return VeriffDataManager.instance;
  }

  /**
   * Process incoming webhook data and update user record consistently
   */
  async processWebhookData(userId: string, webhookData: any): Promise<void> {
    try {
      console.log(`🔄 Processing webhook data for user: ${userId}`);

      // Extract and validate webhook data
      const processedData = this.extractWebhookData(webhookData);
      
      // Update user record with all data atomically
      await this.updateUserVeriffData(userId, processedData);
      
      // Start real-time sync if enabled
      if (this.config.enableRealTimeSync) {
        this.startRealTimeSync(userId);
      }

      console.log(`✅ Webhook data processed successfully for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error processing webhook data for user ${userId}:`, error);
      
      if (this.config.autoRetryFailedWebhooks) {
        await this.retryWebhookProcessing(userId, webhookData);
      }
      
      throw error;
    }
  }

  /**
   * Extract and normalize data from Veriff webhook
   */
  private extractWebhookData(webhookData: any) {
    const now = new Date().toISOString();
    
    return {
      // Session and verification metadata
      veriffSessionId: webhookData.session?.id || null,
      veriffVerificationId: webhookData.verification?.id || null,
      veriffAttemptId: webhookData.attempt?.id || null,
      veriffStatus: webhookData.status || null,
      veriffFeature: webhookData.feature || null,
      veriffCode: webhookData.code || null,
      veriffReason: webhookData.reason || null,
      veriffAction: webhookData.action || null,

      // Person data
      veriffPersonGivenName: webhookData.person?.givenName || null,
      veriffPersonLastName: webhookData.person?.lastName || null,
      veriffPersonIdNumber: webhookData.person?.idNumber || null,
      veriffPersonDateOfBirth: webhookData.person?.dateOfBirth || null,
      veriffPersonNationality: webhookData.person?.nationality || null,
      veriffPersonGender: webhookData.person?.gender || null,
      veriffPersonCountry: webhookData.person?.country || null,

      // Document data
      veriffDocumentType: webhookData.document?.type || null,
      veriffDocumentNumber: webhookData.document?.number || null,
      veriffDocumentCountry: webhookData.document?.country || null,
      veriffDocumentValidFrom: webhookData.document?.validFrom || null,
      veriffDocumentValidUntil: webhookData.document?.validUntil || null,
      veriffDocumentIssuedBy: webhookData.document?.issuedBy || null,

      // Verification results
      veriffFaceMatchSimilarity: webhookData.additionalVerification?.faceMatch?.similarity || null,
      veriffFaceMatchStatus: webhookData.additionalVerification?.faceMatch?.status || null,
      veriffDecisionScore: webhookData.decisionScore || null,
      veriffQualityScore: webhookData.qualityScore || null,
      veriffFlags: webhookData.flags || null,
      veriffContext: webhookData.context || null,

      // Timestamps
      veriffCreatedAt: webhookData.createdAt || now,
      veriffUpdatedAt: webhookData.updatedAt || now,
      veriffSubmittedAt: webhookData.submittedAt || null,
      veriffApprovedAt: webhookData.approvedAt || null,
      veriffDeclinedAt: webhookData.declinedAt || null,
      veriffWebhookReceivedAt: now,

      // Raw webhook data for debugging
      veriffWebhookData: webhookData,

      // Verification status
      identityVerified: webhookData.status === 'approved',
      identityVerifiedAt: webhookData.status === 'approved' ? now : null
    };
  }

  /**
   * Update user record with all Veriff data atomically
   */
  private async updateUserVeriffData(userId: string, data: any): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);

    if (error) {
      console.error(`❌ Error updating user ${userId} Veriff data:`, error);
      throw error;
    }

    console.log(`✅ User ${userId} Veriff data updated successfully`);
  }

  /**
   * Start real-time sync for a user
   */
  private startRealTimeSync(userId: string): void {
    // Clear existing sync interval if any
    this.stopRealTimeSync(userId);

    const interval = setInterval(async () => {
      try {
        await this.syncUserVeriffStatus(userId);
      } catch (error) {
        console.error(`❌ Error in real-time sync for user ${userId}:`, error);
      }
    }, this.config.syncInterval);

    this.syncIntervals.set(userId, interval);
    console.log(`🔄 Started real-time sync for user: ${userId}`);
  }

  /**
   * Stop real-time sync for a user
   */
  private stopRealTimeSync(userId: string): void {
    const interval = this.syncIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(userId);
      console.log(`⏹️ Stopped real-time sync for user: ${userId}`);
    }
  }

  /**
   * Sync user's Veriff status from Veriff API
   */
  async syncUserVeriffStatus(userId: string): Promise<void> {
    try {
      // Get user's current Veriff data
      const { data: user } = await supabase
        .from('users')
        .select('veriffSessionId, veriffVerificationId, veriffStatus, identityVerified')
        .eq('id', userId)
        .single();

      if (!user) {
        console.warn(`⚠️ User ${userId} not found for sync`);
        return;
      }

      // If user has session/verification ID, fetch latest status from Veriff
      if (user.veriffSessionId || user.veriffVerificationId) {
        const veriffStatus = await VeriffService.getUserVeriffStatus(userId);
        
        if (veriffStatus && veriffStatus.veriffData) {
          // Update only status-related fields, not the full data
          const statusUpdate = {
            veriffStatus: veriffStatus.veriffData.status,
            identityVerified: veriffStatus.isVerified,
            veriffUpdatedAt: new Date().toISOString()
          };

          await this.updateUserVeriffData(userId, statusUpdate);
        }
      }
    } catch (error) {
      console.error(`❌ Error syncing Veriff status for user ${userId}:`, error);
    }
  }

  /**
   * Retry failed webhook processing
   */
  private async retryWebhookProcessing(userId: string, webhookData: any, attempt: number = 1): Promise<void> {
    if (attempt > this.config.maxRetryAttempts!) {
      console.error(`❌ Max retry attempts reached for user ${userId}`);
      return;
    }

    console.log(`🔄 Retrying webhook processing for user ${userId} (attempt ${attempt})`);
    
    setTimeout(async () => {
      try {
        await this.processWebhookData(userId, webhookData);
      } catch (error) {
        console.error(`❌ Retry ${attempt} failed for user ${userId}:`, error);
        await this.retryWebhookProcessing(userId, webhookData, attempt + 1);
      }
    }, 5000 * attempt); // Exponential backoff
  }

  /**
   * Get comprehensive user verification data
   */
  async getUserVerificationData(userId: string): Promise<any> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error(`❌ Error fetching user ${userId} data:`, error);
        throw error;
      }

      // Transform user data into a consistent format
      return this.transformUserDataToVerificationFormat(user);
    } catch (error) {
      console.error(`❌ Error getting verification data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Transform user data into consistent verification format
   */
  private transformUserDataToVerificationFormat(user: any) {
    return {
      // Session and metadata
      sessionId: user.veriffSessionId,
      verificationId: user.veriffVerificationId,
      status: user.veriffStatus,
      feature: user.veriffFeature,
      code: user.veriffCode,
      reason: user.veriffReason,
      action: user.veriffAction,

      // Person data
      person: {
        givenName: user.veriffPersonGivenName,
        lastName: user.veriffPersonLastName,
        idNumber: user.veriffPersonIdNumber,
        dateOfBirth: user.veriffPersonDateOfBirth,
        nationality: user.veriffPersonNationality,
        gender: user.veriffPersonGender,
        country: user.veriffPersonCountry
      },

      // Document data
      document: {
        type: user.veriffDocumentType,
        number: user.veriffDocumentNumber,
        country: user.veriffDocumentCountry,
        validFrom: user.veriffDocumentValidFrom,
        validUntil: user.veriffDocumentValidUntil,
        issuedBy: user.veriffDocumentIssuedBy
      },

      // Verification results
      faceMatchSimilarity: user.veriffFaceMatchSimilarity,
      faceMatchStatus: user.veriffFaceMatchStatus,
      decisionScore: user.veriffDecisionScore,
      qualityScore: user.veriffQualityScore,
      flags: user.veriffFlags,
      context: user.veriffContext,

      // Timestamps
      createdAt: user.veriffCreatedAt,
      updatedAt: user.veriffUpdatedAt,
      submittedAt: user.veriffSubmittedAt,
      approvedAt: user.veriffApprovedAt,
      declinedAt: user.veriffDeclinedAt,
      webhookReceivedAt: user.veriffWebhookReceivedAt,

      // Raw data
      webhookData: user.veriffWebhookData,

      // Legacy fields
      isVerified: user.identityVerified,
      identityVerifiedAt: user.identityVerifiedAt
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Stop all real-time sync intervals
    for (const [userId, interval] of this.syncIntervals) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();
    console.log('🧹 VeriffDataManager cleanup completed');
  }

  /**
   * Get sync status for all users
   */
  getSyncStatus(): { activeUsers: string[]; totalUsers: number } {
    return {
      activeUsers: Array.from(this.syncIntervals.keys()),
      totalUsers: this.syncIntervals.size
    };
  }
}

// Export singleton instance
export const veriffDataManager = VeriffDataManager.getInstance();
