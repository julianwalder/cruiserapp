import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Veriff webhook payload interface based on official documentation
interface VeriffWebhookPayload {
  id: string;
  code: number;
  action: string;
  feature: string;
  attemptId: string;
  endUserId?: string;
  vendorData?: string;
  timestamp: string;
  
  // Person data (extracted from document)
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
  
  // Document data
  document?: {
    type: string;
    number: string;
    country: string;
    validFrom?: string;
    validUntil?: string;
    issuedBy?: string;
  };
  
  // Verification results
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
      faceMatch?: {
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
  
  // Additional verification data
  additionalVerification?: {
    faceMatch?: {
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
}

/**
 * Generate HMAC signature for webhook validation
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

/**
 * Validate webhook signature
 */
function validateSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Extract user ID from webhook payload
 */
function extractUserId(payload: VeriffWebhookPayload): string | null {
  // Try different methods to get user ID
  if (payload.vendorData) {
    return payload.vendorData;
  }
  
  if (payload.endUserId) {
    return payload.endUserId;
  }
  
  if (payload.verification?.id) {
    return payload.verification.id;
  }
  
  return null;
}

/**
 * Determine verification status from webhook action/code
 */
function getVerificationStatus(payload: VeriffWebhookPayload): string {
  // Map Veriff action codes to status
  switch (payload.code) {
    case 7001: // started
      return 'submitted';
    case 7002: // submitted
      return 'submitted';
    case 7003: // approved
      return 'approved';
    case 7004: // declined
      return 'declined';
    case 7005: // review
      return 'review';
    default:
      // Fallback to action or verification status
      if (payload.verification?.status) {
        return payload.verification.status;
      }
      if (payload.action) {
        return payload.action;
      }
      return 'unknown';
  }
}

/**
 * Update user verification data in database
 */
async function updateUserVerification(userId: string, payload: VeriffWebhookPayload): Promise<void> {
  const status = getVerificationStatus(payload);
  const isVerified = status === 'approved';
  
  console.log(`🔄 Updating user ${userId} with status: ${status}`);
  
  // Prepare update data
  const updateData: any = {
    veriffSessionId: payload.id,
    veriffStatus: status,
    identityVerified: isVerified,
    identityVerifiedAt: isVerified ? new Date().toISOString() : null,
    veriffData: payload,
    updatedAt: new Date().toISOString(),
  };
  
  // Add specific timestamp fields based on status
  if (status === 'approved') {
    updateData.veriffApprovedAt = payload.updatedAt || new Date().toISOString();
  } else if (status === 'declined') {
    updateData.veriffDeclinedAt = payload.updatedAt || new Date().toISOString();
  } else if (status === 'submitted') {
    updateData.veriffSubmittedAt = payload.updatedAt || new Date().toISOString();
  }
  
  // Store person data if available
  const personData = payload.person || payload.verification?.person;
  if (personData) {
    updateData.veriffPersonGivenName = personData.givenName;
    updateData.veriffPersonLastName = personData.lastName;
    updateData.veriffPersonIdNumber = personData.idNumber;
    updateData.veriffPersonDateOfBirth = personData.dateOfBirth;
    updateData.veriffPersonNationality = personData.nationality;
    updateData.veriffPersonGender = personData.gender;
    updateData.veriffPersonCountry = personData.country;
  }
  
  // Store document data if available
  const documentData = payload.document || payload.verification?.document;
  if (documentData) {
    updateData.veriffDocumentType = documentData.type;
    updateData.veriffDocumentNumber = documentData.number;
    updateData.veriffDocumentCountry = documentData.country;
    updateData.veriffDocumentValidFrom = documentData.validFrom;
    updateData.veriffDocumentValidUntil = documentData.validUntil;
    updateData.veriffDocumentIssuedBy = documentData.issuedBy;
  }
  
  // Store verification results if available
  const additionalVerification = payload.additionalVerification || payload.verification?.additionalVerification;
  if (additionalVerification?.faceMatch) {
    updateData.veriffFaceMatchSimilarity = additionalVerification.faceMatch.similarity;
    updateData.veriffFaceMatchStatus = additionalVerification.faceMatch.status;
  }
  
  // Store decision and insights if available
  if (payload.decisionScore !== undefined) {
    updateData.veriffDecisionScore = payload.decisionScore;
  }
  if (payload.insights) {
    updateData.veriffQualityScore = payload.insights.quality;
    updateData.veriffFlags = payload.insights.flags;
    updateData.veriffContext = payload.insights.context;
  }
  
  // Set timestamps
  if (payload.createdAt) {
    updateData.veriffCreatedAt = new Date(payload.createdAt);
  }
  if (payload.updatedAt) {
    updateData.veriffUpdatedAt = new Date(payload.updatedAt);
  }
  
  // Update user in database
  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);
  
  if (error) {
    console.error(`❌ Error updating user ${userId}:`, error);
    throw new Error(`Failed to update user verification: ${error.message}`);
  }
  
  console.log(`✅ Successfully updated user ${userId} verification status to ${status}`);
}

/**
 * Log webhook event for monitoring
 */
async function logWebhookEvent(userId: string, payload: VeriffWebhookPayload, status: string): Promise<void> {
  try {
    const webhookEvent = {
      userid: userId,
      eventtype: 'received',
      webhooktype: status,
      sessionid: payload.id,
      status: 'success',
      payload: payload,
      error: null,
      retrycount: 0,
      createdat: new Date().toISOString(),
      processedat: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('webhook_events')
      .insert(webhookEvent);
    
    if (error) {
      console.error('❌ Error logging webhook event:', error);
    } else {
      console.log('📝 Webhook event logged successfully');
    }
  } catch (error) {
    console.error('❌ Error logging webhook event:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Received Veriff Full Auto webhook');
    
    // Get the raw body for signature validation
    const body = await request.text();
    const signature = request.headers.get('x-veriff-signature');
    
    console.log('Webhook signature:', signature);
    console.log('Webhook body length:', body.length);
    
    if (!signature) {
      console.error('❌ Missing Veriff signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }
    
    // Validate webhook secret
    const webhookSecret = process.env.VERIFF_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ Veriff webhook secret not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    // Validate the webhook signature
    const isValidSignature = validateSignature(body, signature, webhookSecret);
    
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    console.log('✅ Webhook signature validated successfully');
    
    // Parse the JSON payload
    let payload: VeriffWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    console.log('📋 Webhook payload:', {
      id: payload.id,
      code: payload.code,
      action: payload.action,
      feature: payload.feature,
      vendorData: payload.vendorData,
      endUserId: payload.endUserId
    });
    
    // Extract user ID from payload
    const userId = extractUserId(payload);
    if (!userId) {
      console.error('❌ No user ID found in webhook payload');
      return NextResponse.json({ error: 'No user ID found' }, { status: 400 });
    }
    
    console.log(`👤 Processing webhook for user: ${userId}`);
    
    // Determine verification status
    const status = getVerificationStatus(payload);
    console.log(`📊 Verification status: ${status}`);
    
    // Update user verification data
    await updateUserVerification(userId, payload);
    
    // Log webhook event
    await logWebhookEvent(userId, payload, status);
    
    console.log('✅ Webhook processed successfully');
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      userId: userId,
      status: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Veriff Full Auto webhook endpoint is active',
    timestamp: new Date().toISOString(),
    status: 'ready'
  });
}

