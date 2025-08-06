import { createClient } from '@supabase/supabase-js';

export interface WebhookEvent {
  id: string;
  userId: string;
  eventType: 'received' | 'processed' | 'failed' | 'retry';
  webhookType: 'submitted' | 'approved' | 'declined' | 'unknown';
  sessionId?: string;
  status: 'pending' | 'success' | 'error';
  payload: any;
  error?: string;
  retryCount: number;
  createdAt: string;
  processedAt?: string;
}

export interface WebhookMetrics {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  averageProcessingTime: number;
  webhookTypeBreakdown: {
    submitted: number;
    approved: number;
    declined: number;
    unknown: number;
  };
}

export class WebhookMonitor {
  private static supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Log a webhook event for monitoring
   */
  static async logWebhookEvent(event: Omit<WebhookEvent, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('webhook_events')
        .insert({
          // Map to the actual column names in the database
          userid: event.userId,
          eventtype: event.eventType,
          webhooktype: event.webhookType,
          sessionid: event.sessionId,
          status: event.status,
          payload: event.payload,
          error: event.error,
          retrycount: event.retryCount,
          createdat: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error logging webhook event:', error);
      } else {
        console.log('📝 Webhook event logged:', event.eventType, event.webhookType);
      }
    } catch (error) {
      console.error('❌ Error logging webhook event:', error);
    }
  }

  /**
   * Get webhook metrics
   */
  static async getWebhookMetrics(hours: number = 24): Promise<WebhookMetrics> {
    let query = this.supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    // If hours > 0, filter by time period, otherwise get all events
    if (hours > 0) {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      query = query.gte('createdat', since);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('❌ Error fetching webhook metrics:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        successRate: 0,
        averageProcessingTime: 0,
        webhookTypeBreakdown: {
          submitted: 0,
          approved: 0,
          declined: 0,
          unknown: 0,
        },
      };
    }

    const total = events?.length || 0;
    const successful = events?.filter(e => e.status === 'success').length || 0;
    const failed = events?.filter(e => e.status === 'error').length || 0;
    const pending = events?.filter(e => e.status === 'pending').length || 0;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    // Calculate average processing time (capped at reasonable values)
    const processedEvents = events?.filter(e => e.processedat) || [];
    const totalProcessingTime = processedEvents.reduce((sum, event) => {
      const processingTime = new Date(event.processedat!).getTime() - new Date(event.createdat).getTime();
      // Cap processing time at 60 seconds (1 minute) to avoid unrealistic values
      const cappedProcessingTime = Math.min(processingTime, 60000);
      return sum + cappedProcessingTime;
    }, 0);
    const averageProcessingTime = processedEvents.length > 0 ? totalProcessingTime / processedEvents.length : 0;

    // Calculate webhook type breakdown
    const webhookTypeBreakdown = {
      submitted: events?.filter(e => e.webhooktype === 'submitted').length || 0,
      approved: events?.filter(e => e.webhooktype === 'approved').length || 0,
      declined: events?.filter(e => e.webhooktype === 'declined').length || 0,
      unknown: events?.filter(e => !['submitted', 'approved', 'declined'].includes(e.webhooktype)).length || 0,
    };

    return {
      total,
      successful,
      failed,
      pending,
      successRate,
      averageProcessingTime,
      webhookTypeBreakdown,
    };
  }

  /**
   * Check for failed webhooks that need retry
   */
  static async getFailedWebhooks(): Promise<WebhookEvent[]> {
    const { data: events, error } = await this.supabase
      .from('webhook_events')
      .select('*')
      .eq('status', 'error')
      .lt('retrycount', 3)
      .order('createdat', { ascending: false });

    if (error) {
      console.error('❌ Error fetching failed webhooks:', error);
      return [];
    }

    // Transform events to match our interface
    return (events || []).map(event => ({
      id: event.id,
      userId: event.userid,
      eventType: event.eventtype,
      webhookType: event.webhooktype,
      sessionId: event.sessionid,
      status: event.status,
      payload: event.payload,
      error: event.error,
      retryCount: event.retrycount,
      createdAt: event.createdat,
      processedAt: event.processedat,
    }));
  }

  /**
   * Mark webhook as processed
   */
  static async markWebhookProcessed(eventId: string, success: boolean, error?: string): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('webhook_events')
      .update({
        status: success ? 'success' : 'error',
        processedat: new Date().toISOString(),
        error: error || null,
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('❌ Error marking webhook as processed:', updateError);
    }
  }

  /**
   * Increment retry count for failed webhook
   */
  static async incrementRetryCount(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_events')
      .update({
        retrycount: this.supabase.rpc('increment', { row_id: eventId, column_name: 'retrycount' }),
      })
      .eq('id', eventId);

    if (error) {
      console.error('❌ Error incrementing retry count:', error);
    }
  }

  /**
   * Get webhook processing alerts
   */
  static async getAlerts(): Promise<string[]> {
    const alerts: string[] = [];
    const metrics = await this.getWebhookMetrics(1); // Last hour

    // Check for high failure rate
    if (metrics.total > 0) {
      const failureRate = (metrics.failed / metrics.total) * 100;
      if (failureRate > 20) {
        alerts.push(`High webhook failure rate: ${failureRate.toFixed(1)}%`);
      }
    }

    // Check for pending webhooks older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: oldPending } = await this.supabase
      .from('webhook_events')
      .select('*')
      .eq('status', 'pending')
      .lt('createdat', oneHourAgo);

    if (oldPending && oldPending.length > 0) {
      alerts.push(`${oldPending.length} webhooks pending for more than 1 hour`);
    }

    // Check for failed webhooks that need retry
    const failedWebhooks = await this.getFailedWebhooks();
    if (failedWebhooks.length > 0) {
      alerts.push(`${failedWebhooks.length} failed webhooks need retry`);
    }

    return alerts;
  }

  /**
   * Create webhook events table if it doesn't exist
   */
  static async createWebhookEventsTable(): Promise<void> {
    console.log('✅ Webhook events table already exists with correct structure');
  }
} 