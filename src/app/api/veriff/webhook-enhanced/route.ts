import { NextRequest, NextResponse } from 'next/server';
import { veriffDataManager } from '@/lib/veriff-data-manager';
import { getLazySupabaseClient } from '@/lib/supabase';

const supabase = getLazySupabaseClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Enhanced Veriff webhook received');

    // Verify webhook signature (if configured)
    const signature = request.headers.get('x-veriff-signature');
    if (process.env.VERIFF_WEBHOOK_SECRET && signature) {
      // TODO: Implement signature verification
      console.log('🔐 Webhook signature verification (to be implemented)');
    }

    const webhookData = await request.json();
    console.log('📦 Webhook payload:', JSON.stringify(webhookData, null, 2));

    // Extract user ID from webhook data with multiple fallback strategies
    const userId = await extractUserIdFromWebhook(webhookData);
    if (!userId) {
      console.error('❌ No user ID found in webhook data');
      return NextResponse.json({ error: 'No user ID found' }, { status: 400 });
    }

    console.log(`✅ Extracted user ID: ${userId}`);

    // Process webhook data using the robust data manager
    await veriffDataManager.processWebhookData(userId, webhookData);

    // Log successful processing
    console.log(`✅ Enhanced webhook processed successfully for user: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      userId,
      status: webhookData.status 
    });

  } catch (error) {
    console.error('❌ Enhanced webhook processing error:', error);
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Extract user ID from various webhook formats with multiple fallback strategies
 */
async function extractUserIdFromWebhook(webhookData: any): Promise<string | null> {
  console.log('🔍 Extracting user ID from webhook data...');
  
  // Strategy 1: Direct user ID fields
  const directUserId = webhookData.userId || 
                      webhookData.user?.id || 
                      webhookData.vendorData ||
                      webhookData.session?.user?.id ||
                      webhookData.verification?.user?.id ||
                      webhookData.person?.userId ||
                      webhookData.metadata?.userId ||
                      webhookData.custom?.userId;

  if (directUserId && typeof directUserId === 'string') {
    console.log(`✅ Found direct user ID: ${directUserId}`);
    return directUserId;
  }

  // Strategy 2: Look up by session ID
  if (webhookData.session?.id || webhookData.id) {
    const sessionId = webhookData.session?.id || webhookData.id;
    console.log(`🔍 Looking up user by session ID: ${sessionId}`);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('veriffSessionId', sessionId)
      .single();

    if (user?.id) {
      console.log(`✅ Found user by session ID: ${user.id}`);
      return user.id;
    }
  }

  // Strategy 3: Look up by verification ID
  if (webhookData.verification?.id) {
    console.log(`🔍 Looking up user by verification ID: ${webhookData.verification.id}`);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('veriffVerificationId', webhookData.verification.id)
      .single();

    if (user?.id) {
      console.log(`✅ Found user by verification ID: ${user.id}`);
      return user.id;
    }
  }

  // Strategy 4: Look for recent Veriff sessions (fallback for SelfID)
  if (webhookData.feature === 'selfid') {
    console.log('🔍 Looking for recent SelfID sessions...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, veriffSessionId, veriffStatus, updatedAt')
      .not('veriffSessionId', 'is', null)
      .order('updatedAt', { ascending: false })
      .limit(5);

    if (users && users.length > 0) {
      console.log(`🔍 Found ${users.length} users with recent Veriff sessions:`);
      users.forEach(user => {
        console.log(`   - ${user.email}: ${user.veriffSessionId} (${user.veriffStatus})`);
      });
      
      // For SelfID, we might need to match by email or other criteria
      // This is a fallback strategy - ideally the webhook should contain vendorData
      console.log('⚠️  No direct user ID found, but found users with recent sessions');
      console.log('📋 Webhook data for manual matching:', {
        feature: webhookData.feature,
        action: webhookData.action,
        status: webhookData.status,
        sessionId: webhookData.id,
        personData: webhookData.person
      });
    }
  }

  console.error('❌ Could not extract user ID from webhook data');
  return null;
}

/**
 * Handle GET requests for webhook verification
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Enhanced Veriff webhook endpoint is active',
    timestamp: new Date().toISOString(),
    status: 'ready',
    features: [
      'Comprehensive user ID extraction',
      'Multiple fallback strategies',
      'Robust data processing',
      'Real-time sync support'
    ]
  });
}
