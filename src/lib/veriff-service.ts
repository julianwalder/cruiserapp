import { getSupabaseClient } from '@/lib/supabase';

export interface VeriffSession {
  id: string;
  url: string;
  status: string;
  created_at: string;
  verification: {
    id: string;
    status: string;
    method: string;
    code: number;
  };
}

export interface VeriffVerification {
  id: string;
  status: 'created' | 'submitted' | 'approved' | 'declined' | 'abandoned' | 'expired';
  reason?: string;
  person: {
    givenName: string;
    lastName: string;
    idNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    gender?: string;
    country?: string;
  };
  document: {
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
      status: 'approved' | 'declined';
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
}

export class VeriffService {
  private static readonly BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';
  private static readonly API_KEY = process.env.VERIFF_API_KEY;
  private static readonly API_SECRET = process.env.VERIFF_API_SECRET;
  private static readonly ENVIRONMENT = process.env.VERIFF_ENVIRONMENT || 'production';

  /**
   * Create a new Veriff session for identity verification
   */
  static async createSession(userId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<VeriffSession> {
    if (!this.API_KEY || !this.API_SECRET) {
      throw new Error('Veriff API credentials are not configured');
    }

    const payload = {
      verification: {
        callback: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/veriff/callback`,
        person: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email
        },
        document: {
          type: 'PASSPORT'
        },
        vendorData: userId
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);
    
    console.log('Veriff API Request (FULL AUTO IDV):', {
      url: `${this.BASE_URL}/sessions`,
      environment: this.ENVIRONMENT,
      payload: payloadString,
      payloadLength: payloadString.length,
      payloadPreview: payloadString.substring(0, 200) + '...',
      signature: signature.substring(0, 10) + '...',
      apiKey: this.API_KEY ? `${this.API_KEY.substring(0, 8)}...` : 'Not set',
      apiSecret: this.API_SECRET ? `${this.API_SECRET.substring(0, 8)}...` : 'Not set'
    });

    const response = await fetch(`${this.BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': this.API_KEY,
        'X-HMAC-SIGNATURE': signature,
      },
      body: payloadString,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Veriff session: ${error}`);
    }

    const responseData = await response.json();

    // Debug: Log the session response
    console.log('Veriff Session Response:', {
      sessionId: responseData.verification?.id,
      sessionUrl: responseData.verification?.url,
      sessionStatus: responseData.verification?.status,
      fullResponse: responseData
    });

    // Store session in database
    await this.storeSession(userId, responseData.verification.id, responseData.verification.url);

    // Return in expected format
    return {
      id: responseData.verification.id,
      url: responseData.verification.url,
      status: responseData.verification.status,
      created_at: new Date().toISOString(),
      verification: {
        id: responseData.verification.id,
        status: responseData.verification.status,
        method: 'web',
        code: 200
      }
    };
  }

  /**
   * Get verification details from Veriff
   */
  static async getVerification(verificationId: string): Promise<VeriffVerification> {
    if (!this.API_KEY || !this.API_SECRET) {
      throw new Error('Veriff API credentials not configured');
    }

    try {
    const response = await fetch(`${this.BASE_URL}/verifications/${verificationId}`, {
      method: 'GET',
      headers: {
        'X-AUTH-CLIENT': this.API_KEY,
          'X-HMAC-SIGNATURE': this.generateSignature(''),
      },
    });

    if (!response.ok) {
        console.warn(`Verification API returned ${response.status} for ID: ${verificationId}`);
        // Throw error for 404 (expired session) but return mock data for other errors
        if (response.status === 404) {
          throw new Error(`Session not found (404): ${verificationId}`);
        }
        // Return a mock verification object for other API errors
        return {
          id: verificationId,
          status: 'submitted' as any,
          person: { givenName: '', lastName: '' },
          document: { type: '', number: '', country: '' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    }

    return await response.json();
    } catch (error) {
      console.error('Error getting verification from API:', error);
      // Re-throw 404 errors for session validation
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('404') || errorMessage.includes('Session not found')) {
        throw error; // Re-throw so session validation can handle it
      }
      // Return a mock verification object for other errors
      return {
        id: verificationId,
        status: 'submitted' as any,
        person: { givenName: '', lastName: '' },
        document: { type: '', number: '', country: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Handle Veriff webhook callback
   */
  static async handleCallback(payload: any): Promise<void> {
    console.log('Processing webhook payload:', payload);

    // Handle different types of webhooks
    if (payload.verification && payload.verification.id) {
      // Traditional verification webhook
      console.log('Processing verification webhook for:', payload.verification.id);
      
      try {
        const verificationDetails = await this.getVerification(payload.verification.id);
        console.log('Retrieved verification details:', verificationDetails);
        await this.updateUserVerification(payload.verification.id, verificationDetails);
      } catch (error) {
        console.error('Error processing verification webhook:', error);
      }
    } else if (payload.feature === 'selfid' && (payload.action === 'submitted' || payload.action === 'approved')) {
      // SelfID webhook - user has submitted or been approved
      console.log('Processing SelfID webhook for session:', payload.id, 'action:', payload.action);
      
      try {
        // Find user by vendorData (which contains the userId)
        const userId = payload.vendorData;
        if (userId) {
          console.log('Updating user verification status for SelfID:', userId, 'action:', payload.action);
          
          // Update user status based on action
          if (payload.action === 'approved') {
            await this.updateUserApprovedStatus(userId, payload);
          } else {
            await this.updateUserSelfIDStatus(userId, payload);
          }
        }
      } catch (error) {
        console.error('Error processing SelfID webhook:', error);
      }
    } else {
      console.log('Unknown webhook type:', payload);
    }
  }

  /**
   * Store Veriff session in database
   */
  private static async storeSession(userId: string, sessionId: string, sessionUrl: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    const { error } = await supabase
      .from('users')
      .update({
        veriffSessionId: sessionId,
        veriffStatus: 'created',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error storing Veriff session:', error);
      throw new Error('Failed to store Veriff session');
    }
  }

  /**
   * Update user verification status based on Veriff result
   */
  private static async updateUserVerification(verificationId: string, verification: VeriffVerification): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    console.log('Updating user verification for verification ID:', verificationId);
    console.log('Verification details:', verification);

    // Find user by verification ID - try different approaches
    let user = null;
    let findError = null;

    // First try: look for user with this verification ID as session ID
    const { data: user1, error: error1 } = await supabase
      .from('users')
      .select('id, veriffSessionId')
      .eq('veriffSessionId', verificationId)
      .single();

    if (user1) {
      user = user1;
      console.log('Found user by session ID:', user);
    } else {
      console.log('User not found by session ID, trying alternative lookup...');
      
      // Second try: look for any user with a recent Veriff session
      const { data: users, error: error2 } = await supabase
        .from('users')
        .select('id, veriffSessionId, veriffStatus')
        .not('veriffSessionId', 'is', null)
        .eq('veriffStatus', 'created')
        .order('updatedAt', { ascending: false })
        .limit(1);

      if (users && users.length > 0) {
        user = users[0];
        console.log('Found user by recent session:', user);
      } else {
        findError = error2;
        console.error('No users found with recent Veriff sessions');
      }
    }

    if (!user) {
      console.error('User not found for verification:', verificationId);
      return;
    }

    const isVerified = verification.status === 'approved';
    const veriffData = {
      verificationId: verification.id,
      status: verification.status,
      person: verification.person,
      document: verification.document,
      additionalVerification: verification.additionalVerification,
      decisionScore: verification.decisionScore,
      insights: verification.insights,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    };

    console.log('Updating user verification status:', {
      userId: user.id,
      isVerified,
      veriffStatus: verification.status,
      verificationId: verification.id
    });

    const { error: updateError } = await supabase
      .from('users')
      .update({
        identityVerified: isVerified,
        identityVerifiedAt: isVerified ? new Date().toISOString() : null,
        veriffStatus: verification.status,
        veriffData: veriffData,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user verification:', updateError);
      throw new Error('Failed to update user verification status');
    }

    console.log('User verification status updated successfully');
  }

  /**
   * Update user status for SelfID submission
   */
  private static async updateUserSelfIDStatus(userId: string, payload: any): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    console.log('Updating user SelfID status:', { userId, payload });

    const { error: updateError } = await supabase
      .from('users')
      .update({
        veriffSessionId: payload.id, // Update with new session ID from webhook
        veriffStatus: 'submitted',
        veriffData: {
          sessionId: payload.id,
          attemptId: payload.attemptId,
          feature: payload.feature,
          action: payload.action,
          code: payload.code,
          submittedAt: new Date().toISOString(),
          webhookReceivedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user SelfID status:', updateError);
      throw new Error('Failed to update user SelfID status');
    }

    console.log('User SelfID status updated successfully');
  }

  /**
   * Update user status when verification is approved
   */
  private static async updateUserApprovedStatus(userId: string, payload: any): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    console.log('Updating user approved status for user:', userId);

    const { error } = await supabase
      .from('users')
      .update({
        veriffSessionId: payload.id, // Update with session ID from webhook
        veriffStatus: 'approved',
        veriffData: {
          ...payload, // Store full webhook payload
          status: 'approved', // Ensure status is set to approved
          webhookReceivedAt: new Date().toISOString() // Timestamp for webhook receipt
        },
        identityVerified: true, // Mark user as verified
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user approved status:', error);
      throw new Error('Failed to update user approved status');
    }

    console.log('User approved status updated successfully');
  }

  /**
   * Generate Veriff API signature
   */
  private static generateSignature(payloadString: string): string {
    if (!this.API_SECRET) {
      throw new Error('Veriff API secret not configured');
    }

    const crypto = require('crypto');
    
    // Veriff expects the signature to be generated from the raw JSON string
    // without any encoding parameter
    const hmac = crypto.createHmac('sha256', this.API_SECRET);
    hmac.update(payloadString);
    
    const signature = hmac.digest('hex');
    
    console.log('Signature Debug:', {
      payloadLength: payloadString.length,
      payloadPreview: payloadString.substring(0, 100) + '...',
      signatureLength: signature.length,
      signaturePreview: signature.substring(0, 20) + '...',
      apiSecretLength: this.API_SECRET?.length || 0,
      apiSecretPreview: this.API_SECRET?.substring(0, 8) + '...'
    });
    
    return signature;
  }

  /**
   * Clear expired session from database
   */
  private static async clearExpiredSession(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    console.log('Clearing expired session for user:', userId);

    const { error } = await supabase
      .from('users')
      .update({
        veriffSessionId: null,
        veriffSessionUrl: null,
        veriffStatus: null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error clearing expired session:', error);
      throw new Error('Failed to clear expired session');
    }

    console.log('Expired session cleared successfully');
  }

  /**
   * Get user's current Veriff status with session validation
   */
  static async getUserVeriffStatus(userId: string): Promise<{
    sessionId?: string;
    sessionUrl?: string;
    status?: string;
    veriffStatus?: string;
    isVerified: boolean;
    veriffData?: any;
    needsNewSession?: boolean;
  }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    try {
      console.log('Fetching Veriff status for user:', userId);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('veriffSessionId, veriffSessionUrl, veriffStatus, identityVerified, veriffData')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user Veriff status:', error);
        // If columns don't exist, return default status
        if (error.code === '42703') {
          console.warn('Veriff columns not found in database - returning default status');
          return { isVerified: false };
        }
        return { isVerified: false };
      }

      // If no session exists, return default status
      if (!user.veriffSessionId) {
        return { isVerified: false };
      }

      // Validate if the session is still active
      let sessionValid = false;
      let verificationDetails = null;
      
      try {
        verificationDetails = await this.getVerification(user.veriffSessionId);
        console.log('Verification details from API:', verificationDetails);
        sessionValid = true;
      } catch (error) {
        console.error('Error getting verification details:', error);
        // If we get a 404, the session has expired
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          console.log('Session has expired, clearing from database');
          sessionValid = false;
        } else {
          // For other errors, assume session is still valid
          sessionValid = true;
        }
      }

            // If session is invalid, clear it from database but keep veriffData for display
      if (!sessionValid && user.veriffSessionId) {
        await this.clearExpiredSession(userId);
        
        // If the user is already verified (approved), don't show "needs new session"
        if (user.identityVerified || (user.veriffData?.status === 'approved')) {
          return {
            isVerified: true,
            needsNewSession: false,
            veriffData: user.veriffData, // Keep veriffData for display
            veriffStatus: 'approved',
          };
        }
        
        return {
          isVerified: false,
          needsNewSession: true,
          veriffData: user.veriffData, // Keep veriffData for display even when session is expired
        };
      }

      const status = {
        sessionId: user.veriffSessionId,
        sessionUrl: user.veriffSessionUrl || null,
        status: user.veriffStatus,
        isVerified: user.identityVerified || false,
        veriffData: verificationDetails || user.veriffData,
        needsNewSession: false,
      };

      console.log('User Veriff status:', status);
      return status;
    } catch (error) {
      console.error('Error in getUserVeriffStatus:', error);
      return { isVerified: false };
    }
  }

  /**
   * Check if user needs to complete Veriff verification
   */
  static async needsVerification(userId: string): Promise<boolean> {
    const status = await this.getUserVeriffStatus(userId);
    return !status.isVerified;
  }
} 