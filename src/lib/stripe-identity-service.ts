import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface StripeIdentitySession {
  id: string;
  object: string;
  client_secret: string;
  created: number;
  last_verification_report: any;
  last_verification_report_id: string | null;
  livemode: boolean;
  metadata: Record<string, string>;
  options: {
    document: {
      allowed_types: string[];
      require_id_number: boolean;
      require_live_capture: boolean;
      require_matching_selfie: boolean;
    };
  };
  redaction: any;
  return_url: string;
  status: 'requires_input' | 'processing' | 'requires_action' | 'canceled' | 'verified';
  type: string;
  url: string;
  verified_outputs: any;
}

export interface StripeIdentityVerification {
  id: string;
  userId: string;
  sessionId: string;
  status: 'requires_input' | 'processing' | 'requires_action' | 'canceled' | 'verified';
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Stripe Identity specific fields
  stripeSessionId: string;
  stripeClientSecret: string;
  stripeUrl: string;
  // Verification data (populated after successful verification)
  verifiedData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    idNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

export class StripeIdentityService {
  /**
   * Create a new Stripe Identity verification session
   */
  static async createSession(userId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<StripeIdentitySession> {
    try {
      console.log('🔄 Creating Stripe Identity session for user:', userId);

      // Create Stripe Identity verification session
      const session = await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          userId: userId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        },
        options: {
          document: {
            allowed_types: ['driving_license', 'id_card', 'passport'],
            require_id_number: true,
            require_live_capture: true,
            require_matching_selfie: true,
          },
        },
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/stripe-identity-return?user_id=${userId}`,
      });

      console.log('✅ Stripe Identity session created:', {
        sessionId: session.id,
        status: session.status,
        url: session.url
      });

      // Store session in database
      await this.storeSessionInDatabase(userId, session);

      return session;

    } catch (error) {
      console.error('❌ Error creating Stripe Identity session:', error);
      throw new Error(`Failed to create Stripe Identity session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store Stripe Identity session in database
   */
  private static async storeSessionInDatabase(userId: string, session: StripeIdentitySession): Promise<void> {
    try {
      const { error } = await supabase
        .from('stripe_identity_verifications')
        .insert({
          user_id: userId,
          stripe_session_id: session.id,
          stripe_client_secret: session.client_secret,
          stripe_url: session.url,
          status: session.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error storing Stripe Identity session:', error);
        throw error;
      }

      console.log('✅ Stripe Identity session stored in database');
    } catch (error) {
      console.error('❌ Error storing session in database:', error);
      throw error;
    }
  }

  /**
   * Get Stripe Identity session by ID
   */
  static async getSession(sessionId: string): Promise<StripeIdentitySession | null> {
    try {
      const session = await stripe.identity.verificationSessions.retrieve(sessionId);
      return session as StripeIdentitySession;
    } catch (error) {
      console.error('❌ Error retrieving Stripe Identity session:', error);
      return null;
    }
  }

  /**
   * Get user's Stripe Identity verification status
   */
  static async getUserVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    sessionId: string | null;
    status: string | null;
    verifiedData?: any;
  }> {
    try {
      const { data: verification, error } = await supabase
        .from('stripe_identity_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching Stripe Identity verification:', error);
        return { isVerified: false, sessionId: null, status: null };
      }

      if (!verification) {
        return { isVerified: false, sessionId: null, status: null };
      }

      // Check if verification is complete and verified
      const isVerified = verification.status === 'verified' && verification.verified_at !== null;

      return {
        isVerified,
        sessionId: verification.stripe_session_id,
        status: verification.status,
        verifiedData: verification.verified_data
      };

    } catch (error) {
      console.error('❌ Error getting user verification status:', error);
      return { isVerified: false, sessionId: null, status: null };
    }
  }

  /**
   * Handle Stripe Identity webhook
   */
  static async handleWebhook(event: Stripe.Event): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Processing Stripe Identity webhook:', event.type);

      switch (event.type) {
        case 'identity.verification_session.verified':
          await this.handleVerificationVerified(event.data.object as StripeIdentitySession);
          break;
        case 'identity.verification_session.requires_input':
          await this.handleVerificationRequiresInput(event.data.object as StripeIdentitySession);
          break;
        case 'identity.verification_session.canceled':
          await this.handleVerificationCanceled(event.data.object as StripeIdentitySession);
          break;
        default:
          console.log('ℹ️ Unhandled Stripe Identity webhook event type:', event.type);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error handling Stripe Identity webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Handle verified verification session
   */
  private static async handleVerificationVerified(session: StripeIdentitySession): Promise<void> {
    try {
      console.log('✅ Stripe Identity verification verified:', session.id);

      // Extract verified data from session
      const verifiedData = this.extractVerifiedData(session);

      // Update database with verification results
      const { error } = await supabase
        .from('stripe_identity_verifications')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_data: verifiedData,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_session_id', session.id);

      if (error) {
        console.error('❌ Error updating verification status:', error);
        throw error;
      }

      // Update user profile with verified data
      await this.updateUserProfile(session.metadata.userId, verifiedData);

      console.log('✅ Stripe Identity verification completed and user profile updated');

    } catch (error) {
      console.error('❌ Error handling verified verification:', error);
      throw error;
    }
  }

  /**
   * Handle verification session that requires input
   */
  private static async handleVerificationRequiresInput(session: StripeIdentitySession): Promise<void> {
    try {
      console.log('⚠️ Stripe Identity verification requires input:', session.id);

      const { error } = await supabase
        .from('stripe_identity_verifications')
        .update({
          status: 'requires_input',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_session_id', session.id);

      if (error) {
        console.error('❌ Error updating verification status:', error);
        throw error;
      }

    } catch (error) {
      console.error('❌ Error handling requires input verification:', error);
      throw error;
    }
  }

  /**
   * Handle canceled verification session
   */
  private static async handleVerificationCanceled(session: StripeIdentitySession): Promise<void> {
    try {
      console.log('❌ Stripe Identity verification canceled:', session.id);

      const { error } = await supabase
        .from('stripe_identity_verifications')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_session_id', session.id);

      if (error) {
        console.error('❌ Error updating verification status:', error);
        throw error;
      }

    } catch (error) {
      console.error('❌ Error handling canceled verification:', error);
      throw error;
    }
  }

  /**
   * Extract verified data from Stripe Identity session
   */
  private static extractVerifiedData(session: StripeIdentitySession): any {
    try {
      const verifiedOutputs = session.verified_outputs;
      
      if (!verifiedOutputs) {
        return null;
      }

      // Extract document data
      const document = verifiedOutputs.document;
      const selfie = verifiedOutputs.selfie;

      return {
        firstName: document?.first_name,
        lastName: document?.last_name,
        dateOfBirth: document?.dob?.day ? `${document.dob.year}-${document.dob.month.toString().padStart(2, '0')}-${document.dob.day.toString().padStart(2, '0')}` : null,
        idNumber: document?.id_number,
        address: document?.address?.line1,
        city: document?.address?.city,
        state: document?.address?.state,
        country: document?.address?.country,
        postalCode: document?.address?.postal_code,
        documentType: document?.type,
        documentFront: document?.front,
        documentBack: document?.back,
        selfie: selfie?.image,
      };

    } catch (error) {
      console.error('❌ Error extracting verified data:', error);
      return null;
    }
  }

  /**
   * Update user profile with verified data
   */
  private static async updateUserProfile(userId: string, verifiedData: any): Promise<void> {
    try {
      if (!verifiedData) {
        return;
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Map Stripe Identity data to user profile fields
      if (verifiedData.firstName) updateData.stripe_identity_first_name = verifiedData.firstName;
      if (verifiedData.lastName) updateData.stripe_identity_last_name = verifiedData.lastName;
      if (verifiedData.dateOfBirth) updateData.stripe_identity_date_of_birth = verifiedData.dateOfBirth;
      if (verifiedData.idNumber) updateData.stripe_identity_id_number = verifiedData.idNumber;
      if (verifiedData.address) updateData.stripe_identity_address = verifiedData.address;
      if (verifiedData.city) updateData.stripe_identity_city = verifiedData.city;
      if (verifiedData.state) updateData.stripe_identity_state = verifiedData.state;
      if (verifiedData.country) updateData.stripe_identity_country = verifiedData.country;
      if (verifiedData.postalCode) updateData.stripe_identity_postal_code = verifiedData.postalCode;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating user profile:', error);
        throw error;
      }

      console.log('✅ User profile updated with Stripe Identity data');

    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Get verification data for a user
   */
  static async getVerificationData(userId: string): Promise<StripeIdentityVerification | null> {
    try {
      const { data: verification, error } = await supabase
        .from('stripe_identity_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching verification data:', error);
        return null;
      }

      return verification;

    } catch (error) {
      console.error('❌ Error getting verification data:', error);
      return null;
    }
  }
}
