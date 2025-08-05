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
  };
  document: {
    type: string;
    number: string;
    country: string;
    validFrom?: string;
    validUntil?: string;
  };
  additionalVerification?: {
    faceMatch: {
      similarity: number;
      status: 'approved' | 'declined';
    };
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
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);
    
    console.log('Veriff API Request (UPDATED CODE):', {
      url: `${this.BASE_URL}/sessions`,
      environment: this.ENVIRONMENT,
      payload: payloadString,
      payloadLength: payloadString.length,
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

    const response = await fetch(`${this.BASE_URL}/verifications/${verificationId}`, {
      method: 'GET',
      headers: {
        'X-AUTH-CLIENT': this.API_KEY,
        'X-HMAC-SIGNATURE': this.generateSignature(''),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get verification: ${error}`);
    }

    return await response.json();
  }

  /**
   * Handle Veriff webhook callback
   */
  static async handleCallback(payload: any): Promise<void> {
    const { verification } = payload;
    
    if (!verification || !verification.id) {
      throw new Error('Invalid callback payload');
    }

    console.log('Processing webhook for verification:', verification.id);

    try {
      // Get full verification details
      const verificationDetails = await this.getVerification(verification.id);
      console.log('Retrieved verification details:', verificationDetails);
      
      // Update user verification status
      await this.updateUserVerification(verification.id, verificationDetails);
    } catch (error) {
      console.error('Error processing webhook:', error);
      // Don't throw - we want to return 200 to Veriff even if there's an error
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
   * Get user's current Veriff status
   */
  static async getUserVeriffStatus(userId: string): Promise<{
    sessionId?: string;
    sessionUrl?: string;
    status?: string;
    isVerified: boolean;
    veriffData?: any;
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

      const status = {
        sessionId: user.veriffSessionId,
        sessionUrl: user.veriffSessionUrl || null, // Will be null if column doesn't exist
        status: user.veriffStatus,
        isVerified: user.identityVerified || false,
        veriffData: user.veriffData,
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