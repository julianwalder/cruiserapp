import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Enhanced interfaces for robust Veriff integration
export interface VeriffSessionData {
  id: string;
  url: string;
  status: string;
  vendorData?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface VeriffPersonData {
  id: string;
  firstName: string;
  lastName: string;
  idCode?: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  placeOfBirth?: string;
  citizenships: string[];
  pepSanctionMatches: Array<{
    provider: string;
    numberOfMatches: number;
    date: string;
    matches: any[];
    hits: any[];
  }>;
}

export interface VeriffDocumentData {
  number: {
    confidenceCategory: string;
    value: string;
    sources: string[];
  };
  type: {
    value: string;
  };
  country: {
    value: string;
  };
  validUntil: {
    confidenceCategory: string;
    value: string;
    sources: string[];
  };
  validFrom: {
    confidenceCategory: string;
    value: string;
    sources: string[];
  };
  firstIssue?: any;
  placeOfIssue?: any;
  processNumber?: any;
  residencePermitType?: any;
  licenseNumber?: any;
}

export interface VeriffDecisionData {
  decisionScore: number;
  decision: string;
  person: {
    firstName: { confidenceCategory: string; value: string; sources: string[] };
    lastName: { confidenceCategory: string; value: string; sources: string[] };
    dateOfBirth: { confidenceCategory: string; value: string; sources: string[] };
    gender: { confidenceCategory: string; value: string; sources: string[] };
    idNumber: { confidenceCategory: string; value: string; sources: string[] };
    nationality: { confidenceCategory: string; value: string; sources: string[] };
    address?: { confidenceCategory: string; value: string; components: any; sources: string[] };
    placeOfBirth?: any;
    foreignerStatus?: any;
    occupation?: any;
    employer?: any;
    extraNames?: any;
  };
  document: VeriffDocumentData;
  insights: Array<{
    label: string;
    result: string;
    category: string;
  }>;
}

export interface VeriffApiError {
  status: string;
  code?: string;
  message: string;
  details?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class RobustVeriffService {
  private static readonly BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';
  private static readonly API_KEY = process.env.VERIFF_API_KEY;
  private static readonly API_SECRET = process.env.VERIFF_API_SECRET;
  private static readonly ENVIRONMENT = process.env.VERIFF_ENVIRONMENT || 'production';
  
  // Retry configuration
  private static readonly RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  };

  /**
   * Generate HMAC signature for API requests
   */
  private static generateSignature(payload: string): string {
    if (!this.API_SECRET) {
      throw new Error('Veriff API secret not configured');
    }
    
    const hmac = crypto.createHmac('sha256', this.API_SECRET);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Generate HMAC signature for GET requests (sign the sessionId)
   */
  private static generateGetSignature(sessionId: string): string {
    if (!this.API_SECRET) {
      throw new Error('Veriff API secret not configured');
    }
    
    const hmac = crypto.createHmac('sha256', this.API_SECRET);
    hmac.update(sessionId);
    return hmac.digest('hex');
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig = this.RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${operationName} - Attempt ${attempt + 1}/${config.maxRetries + 1}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${operationName} failed (attempt ${attempt + 1}):`, error);
        
        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw new Error(`${operationName} failed after ${config.maxRetries + 1} attempts: ${lastError!.message}`);
  }

  /**
   * Make authenticated API request with proper error handling
   */
  private static async makeApiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    sessionId?: string
  ): Promise<T> {
    if (!this.API_KEY) {
      throw new Error('Veriff API key not configured');
    }

    const url = `${this.BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-auth-client': this.API_KEY,
    };

    // Add signature for GET requests (sign sessionId) or POST requests (sign body)
    if (method === 'GET' && sessionId) {
      headers['x-hmac-signature'] = this.generateGetSignature(sessionId);
    } else if (method === 'POST' && body) {
      const payloadString = JSON.stringify(body);
      headers['x-hmac-signature'] = this.generateSignature(payloadString);
    }

    console.log(`🌐 Making ${method} request to: ${url}`);
    console.log(`🔐 Using signature: ${headers['x-hmac-signature']?.substring(0, 10)}...`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(responseText) as VeriffApiError;
        errorMessage = errorData.message || errorMessage;
        console.error(`❌ Veriff API Error:`, errorData);
      } catch {
        console.error(`❌ Raw error response:`, responseText);
      }
      throw new Error(`Veriff API request failed: ${errorMessage}`);
    }

    if (!responseText) {
      return {} as T;
    }

    try {
      return JSON.parse(responseText) as T;
    } catch (error) {
      throw new Error(`Failed to parse Veriff API response: ${error}`);
    }
  }

  /**
   * Create a new Veriff session with robust error handling
   */
  static async createSession(
    userId: string,
    userData: {
      firstName: string;
      lastName: string;
      email: string;
    }
  ): Promise<VeriffSessionData> {
    return this.withRetry(async () => {
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

      console.log('🚀 Creating Veriff session:', {
        userId,
        userData: { ...userData, email: userData.email.substring(0, 3) + '***' },
        callback: payload.verification.callback
      });

      const response = await this.makeApiRequest<{ session: VeriffSessionData }>(
        '/sessions',
        'POST',
        payload
      );

      if (!response.session) {
        throw new Error('Invalid session response from Veriff API');
      }

      console.log('✅ Veriff session created successfully:', {
        sessionId: response.session.id,
        status: response.session.status
      });

      return response.session;
    }, 'Create Veriff Session');
  }

  /**
   * Get person data from Veriff API with robust error handling
   */
  static async getPersonData(sessionId: string): Promise<VeriffPersonData | null> {
    return this.withRetry(async () => {
      console.log(`👤 Fetching person data for session: ${sessionId}`);
      
      const response = await this.makeApiRequest<{ status: string; person: VeriffPersonData }>(
        `/sessions/${sessionId}/person`,
        'GET',
        undefined,
        sessionId
      );

      if (response.status !== 'success' || !response.person) {
        console.warn(`⚠️ No person data available for session ${sessionId}`);
        return null;
      }

      console.log('✅ Person data retrieved successfully:', {
        name: `${response.person.firstName} ${response.person.lastName}`,
        nationality: response.person.nationality,
        idCode: response.person.idCode
      });

      return response.person;
    }, 'Get Person Data');
  }

  /**
   * Get decision data from Veriff API with robust error handling
   */
  static async getDecisionData(sessionId: string): Promise<VeriffDecisionData | null> {
    return this.withRetry(async () => {
      console.log(`📋 Fetching decision data for session: ${sessionId}`);
      
      // Try the fullauto endpoint first (most comprehensive)
      try {
        const fullAutoResponse = await this.makeApiRequest<VeriffDecisionData>(
          `/sessions/${sessionId}/decision/fullauto?version=1.0.0`,
          'GET',
          undefined,
          sessionId
        );

        console.log('✅ Full auto decision data retrieved successfully:', {
          decision: fullAutoResponse.decision,
          score: fullAutoResponse.decisionScore,
          insights: fullAutoResponse.insights?.length || 0
        });

        return fullAutoResponse;
      } catch (error) {
        console.warn('⚠️ Full auto endpoint failed, trying standard decision endpoint:', error);
        
        // Fallback to standard decision endpoint
        const response = await this.makeApiRequest<{ status: string; verification: any }>(
          `/sessions/${sessionId}/decision`,
          'GET',
          undefined,
          sessionId
        );

        if (response.status !== 'success' || !response.verification) {
          console.warn(`⚠️ No decision data available for session ${sessionId}`);
          return null;
        }

        // Transform standard response to match fullauto format
        const transformedData: VeriffDecisionData = {
          decisionScore: response.verification.decisionScore || 0,
          decision: response.verification.status || 'unknown',
          person: {
            firstName: { confidenceCategory: 'high', value: response.verification.person?.givenName || '', sources: [] },
            lastName: { confidenceCategory: 'high', value: response.verification.person?.lastName || '', sources: [] },
            dateOfBirth: { confidenceCategory: 'high', value: response.verification.person?.dateOfBirth || '', sources: [] },
            gender: { confidenceCategory: 'high', value: response.verification.person?.gender || '', sources: [] },
            idNumber: { confidenceCategory: 'high', value: response.verification.person?.idNumber || '', sources: [] },
            nationality: { confidenceCategory: 'high', value: response.verification.person?.nationality || '', sources: [] },
          },
          document: {
            number: { confidenceCategory: 'high', value: response.verification.document?.number || '', sources: [] },
            type: { value: response.verification.document?.type || '' },
            country: { value: response.verification.document?.country || '' },
            validUntil: { confidenceCategory: 'high', value: response.verification.document?.validUntil || '', sources: [] },
            validFrom: { confidenceCategory: 'high', value: response.verification.document?.validFrom || '', sources: [] },
          },
          insights: []
        };

        return transformedData;
      }
    }, 'Get Decision Data');
  }

  /**
   * Get comprehensive verification data for a session
   */
  static async getComprehensiveVerificationData(sessionId: string): Promise<{
    person: VeriffPersonData | null;
    decision: VeriffDecisionData | null;
    session: VeriffSessionData | null;
  }> {
    console.log(`🔍 Fetching comprehensive verification data for session: ${sessionId}`);
    
    const [person, decision] = await Promise.allSettled([
      this.getPersonData(sessionId),
      this.getDecisionData(sessionId)
    ]);

    const result = {
      person: person.status === 'fulfilled' ? person.value : null,
      decision: decision.status === 'fulfilled' ? decision.value : null,
      session: null as VeriffSessionData | null
    };

    // Log any failures
    if (person.status === 'rejected') {
      console.error('❌ Failed to fetch person data:', person.reason);
    }
    if (decision.status === 'rejected') {
      console.error('❌ Failed to fetch decision data:', decision.reason);
    }

    console.log('📊 Comprehensive data fetch completed:', {
      hasPersonData: !!result.person,
      hasDecisionData: !!result.decision,
      personName: result.person ? `${result.person.firstName} ${result.person.lastName}` : 'N/A',
      decision: result.decision?.decision || 'N/A'
    });

    return result;
  }

  /**
   * Update user verification data in database with comprehensive information
   */
  static async updateUserVerificationData(
    userId: string,
    sessionId: string,
    personData?: VeriffPersonData | null,
    decisionData?: VeriffDecisionData | null
  ): Promise<void> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('💾 Updating user verification data with comprehensive information:', {
      userId,
      sessionId,
      hasPersonData: !!personData,
      hasDecisionData: !!decisionData
    });

    const updateData: any = {
      veriffSessionId: sessionId,
      updatedAt: new Date().toISOString(),
    };

    // Update person data if available
    if (personData) {
      updateData.veriffPersonGivenName = personData.firstName;
      updateData.veriffPersonLastName = personData.lastName;
      updateData.veriffPersonIdNumber = personData.idCode;
      updateData.veriffPersonDateOfBirth = personData.dateOfBirth;
      updateData.veriffPersonNationality = personData.nationality;
      updateData.veriffPersonGender = personData.gender;
      updateData.veriffPersonPlaceOfBirth = personData.placeOfBirth;
      
      // Store PEP/sanction check results
      if (personData.pepSanctionMatches?.length > 0) {
        updateData.veriffPepSanctionMatches = personData.pepSanctionMatches;
      }
    }

    // Update decision data if available
    if (decisionData) {
      updateData.veriffDecisionScore = decisionData.decisionScore;
      updateData.veriffStatus = decisionData.decision;
      updateData.identityVerified = decisionData.decision === 'approved';
      
      // Update document data from decision
      if (decisionData.document) {
        updateData.veriffDocumentType = decisionData.document.type.value;
        updateData.veriffDocumentNumber = decisionData.document.number.value;
        updateData.veriffDocumentCountry = decisionData.document.country.value;
        updateData.veriffDocumentValidFrom = decisionData.document.validFrom.value;
        updateData.veriffDocumentValidUntil = decisionData.document.validUntil.value;
      }

      // Store insights
      if (decisionData.insights?.length > 0) {
        updateData.veriffInsights = decisionData.insights;
      }

      // Set verification timestamp
      if (decisionData.decision === 'approved') {
        updateData.identityVerifiedAt = new Date().toISOString();
        updateData.veriffApprovedAt = new Date().toISOString();
      }
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
  }

  /**
   * Sync verification data from Veriff API for a user
   */
  static async syncUserVerificationData(userId: string, sessionId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log(`🔄 Syncing verification data for user ${userId}, session ${sessionId}`);
      
      const verificationData = await this.getComprehensiveVerificationData(sessionId);
      
      await this.updateUserVerificationData(
        userId,
        sessionId,
        verificationData.person,
        verificationData.decision
      );

      return {
        success: true,
        data: verificationData
      };
    } catch (error) {
      console.error('❌ Error syncing verification data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get user's current verification status with API sync
   */
  static async getUserVerificationStatus(userId: string): Promise<{
    sessionId?: string;
    sessionUrl?: string;
    status?: string;
    veriffStatus?: string;
    isVerified: boolean;
    veriffData?: any;
    needsNewSession?: boolean;
    lastSync?: string;
  }> {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔍 Getting user verification status:', userId);

    // Get user's current verification status
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        veriffSessionId,
        veriffSessionUrl,
        veriffStatus,
        identityVerified,
        veriffWebhookData,
        updatedAt
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user verification status:', error);
      return {
        isVerified: false,
        needsNewSession: true
      };
    }

    // If user is already verified, return their status
    if (user.identityVerified) {
      console.log('✅ User is already verified');
      return {
        sessionId: user.veriffSessionId,
        sessionUrl: user.veriffSessionUrl,
        veriffStatus: user.veriffStatus || 'approved',
        isVerified: true,
        veriffData: user.veriffWebhookData
      };
    }

    // If user has a session ID, try to sync with Veriff API
    if (user.veriffSessionId) {
      console.log('🔄 Syncing with Veriff API for session:', user.veriffSessionId);
      
      const syncResult = await this.syncUserVerificationData(userId, user.veriffSessionId);
      
      if (syncResult.success) {
        console.log('✅ Successfully synced with Veriff API');
        return {
          sessionId: user.veriffSessionId,
          sessionUrl: user.veriffSessionUrl,
          veriffStatus: syncResult.data?.decision?.decision || user.veriffStatus,
          isVerified: syncResult.data?.decision?.decision === 'approved',
          veriffData: syncResult.data,
          lastSync: new Date().toISOString()
        };
      } else {
        console.warn('⚠️ Failed to sync with Veriff API:', syncResult.error);
        // Return cached data if API sync fails
        return {
          sessionId: user.veriffSessionId,
          sessionUrl: user.veriffSessionUrl,
          veriffStatus: user.veriffStatus,
          isVerified: false,
          veriffData: user.veriffWebhookData
        };
      }
    }

    // User needs a new session
    return {
      isVerified: false,
      needsNewSession: true
    };
  }
}




