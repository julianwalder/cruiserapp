import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    switch (action) {
      case 'recent':
        return await getRecentWebhooks();
      case 'user':
        return await getUserWebhookHistory(userId);
      case 'failed':
        return await getFailedWebhooks();
      case 'stats':
        return await getWebhookStats();
      default:
        return await getWebhookOverview();
    }
  } catch (error) {
    console.error('Webhook monitor error:', error);
    return NextResponse.json({ 
      error: 'Webhook monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getWebhookOverview() {
  const { data: recentWebhooks, error: recentError } = await supabase
    .from('webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: failedWebhooks, error: failedError } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);

  const { count: totalWebhooks } = await supabase
    .from('webhook_events')
    .select('*', { count: 'exact', head: true });

  const { count: successfulWebhooks } = await supabase
    .from('webhook_events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success');

  return NextResponse.json({
    success: true,
    overview: {
      totalWebhooks: totalWebhooks || 0,
      successfulWebhooks: successfulWebhooks || 0,
      failedWebhooks: (totalWebhooks || 0) - (successfulWebhooks || 0),
      successRate: totalWebhooks ? ((successfulWebhooks || 0) / totalWebhooks * 100).toFixed(1) : 0,
    },
    recentWebhooks: recentWebhooks || [],
    failedWebhooks: failedWebhooks || [],
  });
}

async function getRecentWebhooks() {
  const { data: webhooks, error } = await supabase
    .from('webhook_events')
    .select(`
      *,
      users!inner(email, firstName, lastName)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching recent webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch recent webhooks' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    webhooks: webhooks || [],
  });
}

async function getUserWebhookHistory(userId: string | null) {
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const { data: webhooks, error } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('userId', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user webhook history:', error);
    return NextResponse.json({ error: 'Failed to fetch user webhook history' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    userId,
    webhooks: webhooks || [],
  });
}

async function getFailedWebhooks() {
  const { data: webhooks, error } = await supabase
    .from('webhook_events')
    .select(`
      *,
      users!inner(email, firstName, lastName)
    `)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching failed webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch failed webhooks' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    webhooks: webhooks || [],
  });
}

async function getWebhookStats() {
  // Get webhook statistics for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: webhooks, error } = await supabase
    .from('webhook_events')
    .select('status, created_at, webhookType')
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Error fetching webhook stats:', error);
    return NextResponse.json({ error: 'Failed to fetch webhook stats' }, { status: 500 });
  }

  const stats = {
    total: webhooks?.length || 0,
    successful: webhooks?.filter(w => w.status === 'success').length || 0,
    failed: webhooks?.filter(w => w.status === 'failed').length || 0,
    byType: {} as Record<string, number>,
    byDay: {} as Record<string, number>,
  };

  // Group by webhook type
  webhooks?.forEach(webhook => {
    const type = webhook.webhookType || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });

  // Group by day
  webhooks?.forEach(webhook => {
    const day = new Date(webhook.created_at).toISOString().split('T')[0];
    stats.byDay[day] = (stats.byDay[day] || 0) + 1;
  });

  return NextResponse.json({
    success: true,
    stats,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, webhookData } = body;

    switch (action) {
      case 'retry':
        return await retryFailedWebhook(userId, webhookData);
      case 'manual':
        return await processManualWebhook(userId, webhookData);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Webhook monitor POST error:', error);
    return NextResponse.json({ 
      error: 'Webhook monitoring action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function retryFailedWebhook(userId: string, webhookData: any) {
  try {
    // Import the enhanced webhook processor
    const { EnhancedVeriffWebhook } = await import('@/lib/enhanced-veriff-webhook');
    
    // Process the webhook data
    await EnhancedVeriffWebhook.processWebhook(webhookData, 'manual-retry');
    
    // Log the retry attempt
    await supabase
      .from('webhook_events')
      .insert({
        userId,
        eventType: 'retry',
        webhookType: 'manual_retry',
        sessionId: webhookData.id,
        status: 'success',
        payload: webhookData,
        retryCount: 1,
      });

    return NextResponse.json({
      success: true,
      message: 'Webhook retry processed successfully',
    });
  } catch (error) {
    console.error('Error retrying webhook:', error);
    return NextResponse.json({ 
      error: 'Failed to retry webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processManualWebhook(userId: string, webhookData: any) {
  try {
    // Import the enhanced webhook processor
    const { EnhancedVeriffWebhook } = await import('@/lib/enhanced-veriff-webhook');
    
    // Process the webhook data
    await EnhancedVeriffWebhook.processWebhook(webhookData, 'manual-process');
    
    // Log the manual processing
    await supabase
      .from('webhook_events')
      .insert({
        userId,
        eventType: 'manual',
        webhookType: 'manual_processing',
        sessionId: webhookData.id,
        status: 'success',
        payload: webhookData,
        retryCount: 0,
      });

    return NextResponse.json({
      success: true,
      message: 'Manual webhook processing completed successfully',
    });
  } catch (error) {
    console.error('Error processing manual webhook:', error);
    return NextResponse.json({ 
      error: 'Failed to process manual webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 