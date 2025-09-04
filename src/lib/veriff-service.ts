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
        veriffSessionUrl: sessionUrl,
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
    console.log('Approval payload:', payload);

    // Extract verification data from SelfID webhook
    const verificationData = {
      // Session and metadata
      sessionId: payload.id,
      status: 'approved',
      action: payload.action,
      feature: payload.feature,
      code: payload.code,
      attemptId: payload.attemptId,
      
      // Person data (if available in webhook)
      person: payload.person || {
        givenName: payload.personGivenName,
        lastName: payload.personLastName,
        idNumber: payload.personIdNumber,
        dateOfBirth: payload.personDateOfBirth,
        nationality: payload.personNationality,
        gender: payload.personGender,
        country: payload.personCountry,
      },
      
      // Document data (if available in webhook)
      document: payload.document || {
        type: payload.documentType,
        number: payload.documentNumber,
        country: payload.documentCountry,
        validFrom: payload.documentValidFrom,
        validUntil: payload.documentValidUntil,
        issuedBy: payload.documentIssuedBy,
      },
      
      // Verification results
      additionalVerification: payload.additionalVerification || {
        faceMatch: {
          similarity: payload.faceMatchSimilarity,
          status: payload.faceMatchStatus,
        },
      },
      
      // Decision and insights
      decisionScore: payload.decisionScore,
      insights: payload.insights || {
        quality: payload.qualityScore,
        flags: payload.flags,
        context: payload.context,
      },
      
      // Timestamps
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      submittedAt: payload.submittedAt,
      approvedAt: new Date().toISOString(),
      
      // Raw webhook data
      webhookReceivedAt: new Date().toISOString(),
      rawPayload: payload,
    };

    const { error } = await supabase
      .from('users')
      .update({
        veriffSessionId: payload.id,
        veriffStatus: 'approved',
        identityVerified: true,
        
        // Store comprehensive verification data
        veriffWebhookData: verificationData,
        
        // Store individual fields for easy access
        veriffPersonGivenName: verificationData.person?.givenName,
        veriffPersonLastName: verificationData.person?.lastName,
        veriffPersonIdNumber: verificationData.person?.idNumber,
        veriffPersonDateOfBirth: verificationData.person?.dateOfBirth,
        veriffPersonNationality: verificationData.person?.nationality,
        veriffPersonGender: verificationData.person?.gender,
        veriffPersonCountry: verificationData.person?.country,
        
        veriffDocumentType: verificationData.document?.type,
        veriffDocumentNumber: verificationData.document?.number,
        veriffDocumentCountry: verificationData.document?.country,
        veriffDocumentValidFrom: verificationData.document?.validFrom,
        veriffDocumentValidUntil: verificationData.document?.validUntil,
        veriffDocumentIssuedBy: verificationData.document?.issuedBy,
        
        veriffFaceMatchSimilarity: verificationData.additionalVerification?.faceMatch?.similarity,
        veriffFaceMatchStatus: verificationData.additionalVerification?.faceMatch?.status,
        veriffDecisionScore: verificationData.decisionScore,
        veriffQualityScore: verificationData.insights?.quality,
        veriffFlags: verificationData.insights?.flags,
        veriffContext: verificationData.insights?.context,
        
        veriffApprovedAt: verificationData.approvedAt,
        veriffWebhookReceivedAt: verificationData.webhookReceivedAt,
        
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user approved status:', error);
      throw new Error('Failed to update user approved status');
    }

    console.log('User approved status updated successfully with comprehensive verification data');
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

      console.log('Fetching Veriff status for user:', userId);
      
    // Get user's current verification status
      const { data: user, error } = await supabase
        .from('users')
      .select(`
        veriffSessionId,
        veriffSessionUrl,
        veriffVerificationId,
        veriffStatus,
        identityVerified,
        veriffData,
        veriffWebhookData
      `)
        .eq('id', userId)
        .single();

      if (error) {
      console.error('Error fetching user verification status:', error);
      return {
        isVerified: false,
        needsNewSession: true
      };
    }

    // If user is already verified, return their status regardless of session ID
    if (user.identityVerified) {
      console.log('User is already verified, returning verified status');
      return {
        sessionId: user.veriffSessionId,
        sessionUrl: user.veriffSessionUrl,
        veriffStatus: user.veriffStatus || 'approved',
        isVerified: true,
        veriffData: user.veriffWebhookData || user.veriffData
      };
    }

    // If user has no verification data, they need a new session
    if (!user.veriffSessionId && !user.veriffVerificationId) {
      return {
        isVerified: false,
        needsNewSession: true
      };
    }

    // For SelfID verifications, try to get the latest status from Veriff API
    if (user.veriffSessionId) {
      try {
        console.log('Attempting to fetch SelfID session status from Veriff API:', user.veriffSessionId);
        
        // For SelfID, we need to use a different endpoint or approach
        // Let's try to get the session details
        if (!this.API_KEY) {
          throw new Error('Veriff API key not configured');
        }
        
        const sessionResponse = await fetch(`${this.BASE_URL}/sessions/${user.veriffSessionId}`, {
          method: 'GET',
          headers: {
            'X-AUTH-CLIENT': this.API_KEY,
            'X-HMAC-SIGNATURE': this.generateSignature(''),
          },
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          console.log('Retrieved session data from Veriff:', sessionData);
          
          // Update user with latest session data
          await supabase
            .from('users')
            .update({
              veriffStatus: sessionData.status,
              veriffData: {
                ...user.veriffWebhookData,
                ...sessionData,
                lastApiCheck: new Date().toISOString()
              },
              updatedAt: new Date().toISOString(),
            })
            .eq('id', userId);

          return {
            sessionId: user.veriffSessionId,
            sessionUrl: user.veriffSessionUrl,
            veriffStatus: sessionData.status,
            isVerified: sessionData.status === 'approved',
            veriffData: {
              ...user.veriffWebhookData,
              ...sessionData,
              lastApiCheck: new Date().toISOString()
            }
          };
        } else {
          console.warn(`Session API returned ${sessionResponse.status} for session: ${user.veriffSessionId}`);
          
          // If session not found, clear expired session but preserve verification status
          if (sessionResponse.status === 404) {
            console.log('Session has expired, clearing from database');
            await this.clearExpiredSession(userId);
            
            // After clearing, check if user was previously verified
            const { data: updatedUser, error: updatedUserError } = await supabase
              .from('users')
              .select('veriffSessionId, veriffSessionUrl, identityVerified, veriffWebhookData, veriffData')
              .eq('id', userId)
              .single();
            
            if (updatedUserError) {
              console.error('Error fetching updated user data:', updatedUserError);
              return {
                isVerified: false,
                needsNewSession: true
              };
            }
            
            if (updatedUser.identityVerified) {
              console.log('User was previously verified, maintaining verification status');
              return {
                sessionId: updatedUser.veriffSessionId,
                sessionUrl: updatedUser.veriffSessionUrl,
                isVerified: true,
                veriffStatus: 'approved',
                veriffData: updatedUser.veriffWebhookData || updatedUser.veriffData
              };
            }
            
            return {
              isVerified: false,
              needsNewSession: true
            };
          }
        }
      } catch (error) {
        console.error('Error fetching session from Veriff API:', error);
      }
    }

    // For traditional verifications, try to get verification details
    if (user.veriffVerificationId) {
      try {
        console.log('Attempting to fetch verification details from Veriff API:', user.veriffVerificationId);
        
        const verificationDetails = await this.getVerification(user.veriffVerificationId);
        console.log('Retrieved verification details from Veriff:', verificationDetails);
        
        // Update user with latest verification data
        await supabase
          .from('users')
          .update({
            veriffStatus: verificationDetails.status,
            veriffData: {
              ...verificationDetails,
              lastApiCheck: new Date().toISOString()
            },
            updatedAt: new Date().toISOString(),
          })
          .eq('id', userId);

        return {
          sessionId: user.veriffSessionId,
          sessionUrl: user.veriffSessionUrl,
          veriffStatus: verificationDetails.status,
          isVerified: verificationDetails.status === 'approved',
          veriffData: {
            ...verificationDetails,
            lastApiCheck: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error('Error getting verification details:', error);
        
        // If verification not found, clear expired session but preserve verification status
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('404') || errorMessage.includes('Session not found')) {
          console.log('Session has expired, clearing from database');
          await this.clearExpiredSession(userId);
          
          // After clearing, check if user was previously verified
          const { data: updatedUser, error: updatedUserError } = await supabase
            .from('users')
            .select('veriffSessionId, veriffSessionUrl, identityVerified, veriffWebhookData, veriffData')
            .eq('id', userId)
            .single();
          
          if (updatedUserError) {
            console.error('Error fetching updated user data:', updatedUserError);
            return {
              isVerified: false,
              needsNewSession: true
            };
          }
          
          if (updatedUser.identityVerified) {
            console.log('User was previously verified, maintaining verification status');
            return {
              sessionId: updatedUser.veriffSessionId,
              sessionUrl: updatedUser.veriffSessionUrl,
              isVerified: true,
              veriffStatus: 'approved',
              veriffData: updatedUser.veriffWebhookData || updatedUser.veriffData
            };
          }
          
          return {
            isVerified: false,
            needsNewSession: true
          };
        }
      }
    }

    // Return current status from database if API calls fail
    return {
        sessionId: user.veriffSessionId,
        sessionUrl: user.veriffSessionUrl,
      veriffStatus: user.veriffStatus,
        isVerified: user.identityVerified || false,
      veriffData: user.veriffWebhookData || user.veriffData
    };
  }

  /**
   * Check if user needs to complete Veriff verification
   */
  static async needsVerification(userId: string): Promise<boolean> {
    const status = await this.getUserVeriffStatus(userId);
    return !status.isVerified;
  }
} 