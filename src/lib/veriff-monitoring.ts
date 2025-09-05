import { createClient } from '@supabase/supabase-js';
import { RobustVeriffService } from './robust-veriff-service';

export interface VerificationSessionMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  averageProcessingTime: number;
  successRate: number;
  last24Hours: {
    sessions: number;
    approved: number;
    declined: number;
    pending: number;
  };
  documentTypes: Record<string, number>;
  countries: Record<string, number>;
  errorRates: Record<string, number>;
}

export interface VerificationAlert {
  id: string;
  type: 'error_rate' | 'processing_time' | 'api_failure' | 'webhook_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface SessionHealthCheck {
  sessionId: string;
  userId: string;
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  lastActivity: string;
  processingTime?: number;
  apiSyncStatus?: 'success' | 'failed' | 'pending';
}

export class VeriffMonitoring {
  private static readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Get comprehensive verification metrics
   */
  static async getVerificationMetrics(): Promise<VerificationSessionMetrics> {
    console.log('📊 Generating verification metrics...');

    try {
      // Get all verification sessions
      const { data: sessions, error } = await this.supabase
        .from('users')
        .select(`
          veriffSessionId,
          veriffStatus,
          identityVerified,
          veriffDocumentType,
          veriffDocumentCountry,
          veriffApprovedAt,
          veriffDeclinedAt,
          veriffSubmittedAt,
          updatedAt,
          createdAt
        `)
        .not('veriffSessionId', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch verification sessions: ${error.message}`);
      }

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Calculate metrics
      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => 
        s.veriffStatus === 'submitted' || s.veriffStatus === 'created'
      ).length;
      const completedSessions = sessions.filter(s => 
        s.veriffStatus === 'approved' || s.veriffStatus === 'declined'
      ).length;
      const failedSessions = sessions.filter(s => 
        s.veriffStatus === 'failed' || s.veriffStatus === 'error'
      ).length;

      // Calculate success rate
      const approvedSessions = sessions.filter(s => s.identityVerified).length;
      const successRate = totalSessions > 0 ? (approvedSessions / totalSessions) * 100 : 0;

      // Calculate average processing time
      const processingTimes = sessions
        .filter(s => s.veriffApprovedAt && s.veriffSubmittedAt)
        .map(s => {
          const submitted = new Date(s.veriffSubmittedAt);
          const approved = new Date(s.veriffApprovedAt);
          return approved.getTime() - submitted.getTime();
        });

      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0;

      // Last 24 hours metrics
      const recentSessions = sessions.filter(s => 
        new Date(s.createdAt) >= last24Hours
      );

      const last24HoursMetrics = {
        sessions: recentSessions.length,
        approved: recentSessions.filter(s => s.identityVerified).length,
        declined: recentSessions.filter(s => s.veriffStatus === 'declined').length,
        pending: recentSessions.filter(s => 
          s.veriffStatus === 'submitted' || s.veriffStatus === 'created'
        ).length,
      };

      // Document types distribution
      const documentTypes = sessions.reduce((acc, session) => {
        const type = session.veriffDocumentType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Countries distribution
      const countries = sessions.reduce((acc, session) => {
        const country = session.veriffDocumentCountry || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Error rates (simplified - would need more detailed error tracking)
      const errorRates = {
        webhook_failures: 0, // Would need webhook_events table
        api_failures: 0,     // Would need API call logs
        processing_errors: failedSessions,
      };

      const metrics: VerificationSessionMetrics = {
        totalSessions,
        activeSessions,
        completedSessions,
        failedSessions,
        averageProcessingTime,
        successRate: Math.round(successRate * 100) / 100,
        last24Hours: last24HoursMetrics,
        documentTypes,
        countries,
        errorRates,
      };

      console.log('✅ Verification metrics generated:', {
        totalSessions,
        successRate: `${metrics.successRate}%`,
        last24Hours: last24HoursMetrics.sessions
      });

      return metrics;

    } catch (error) {
      console.error('❌ Error generating verification metrics:', error);
      throw error;
    }
  }

  /**
   * Perform health check on verification sessions
   */
  static async performHealthCheck(): Promise<SessionHealthCheck[]> {
    console.log('🏥 Performing verification session health check...');

    try {
      // Get active sessions (submitted but not completed)
      const { data: activeSessions, error } = await this.supabase
        .from('users')
        .select(`
          id,
          veriffSessionId,
          veriffStatus,
          veriffSubmittedAt,
          updatedAt
        `)
        .in('veriffStatus', ['submitted', 'created'])
        .not('veriffSessionId', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch active sessions: ${error.message}`);
      }

      const healthChecks: SessionHealthCheck[] = [];

      for (const session of activeSessions) {
        const healthCheck = await this.checkSessionHealth(session);
        healthChecks.push(healthCheck);
      }

      console.log(`✅ Health check completed for ${healthChecks.length} sessions`);
      return healthChecks;

    } catch (error) {
      console.error('❌ Error performing health check:', error);
      throw error;
    }
  }

  /**
   * Check health of individual session
   */
  private static async checkSessionHealth(session: any): Promise<SessionHealthCheck> {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    let apiSyncStatus: 'success' | 'failed' | 'pending' = 'pending';

    // Check if session is too old (stuck)
    const submittedAt = new Date(session.veriffSubmittedAt);
    const now = new Date();
    const hoursSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSubmission > 24) {
      issues.push(`Session stuck for ${Math.round(hoursSinceSubmission)} hours`);
      status = 'error';
    } else if (hoursSinceSubmission > 2) {
      issues.push(`Session pending for ${Math.round(hoursSinceSubmission)} hours`);
      status = 'warning';
    }

    // Try to sync with Veriff API to check if session is still valid
    try {
      const syncResult = await RobustVeriffService.syncUserVerificationData(
        session.id,
        session.veriffSessionId
      );

      if (syncResult.success) {
        apiSyncStatus = 'success';
        if (syncResult.data?.decision?.decision === 'approved') {
          issues.push('Session approved but not updated in database');
          status = 'warning';
        }
      } else {
        apiSyncStatus = 'failed';
        issues.push(`API sync failed: ${syncResult.error}`);
        status = 'error';
      }
    } catch (error) {
      apiSyncStatus = 'failed';
      issues.push(`API sync error: ${error}`);
      status = 'error';
    }

    return {
      sessionId: session.veriffSessionId,
      userId: session.id,
      status,
      issues,
      lastActivity: session.updatedAt,
      processingTime: hoursSinceSubmission,
      apiSyncStatus,
    };
  }

  /**
   * Generate alerts based on metrics and health checks
   */
  static async generateAlerts(): Promise<VerificationAlert[]> {
    console.log('🚨 Generating verification alerts...');

    const alerts: VerificationAlert[] = [];

    try {
      // Get current metrics
      const metrics = await this.getVerificationMetrics();

      // Check success rate
      if (metrics.successRate < 80) {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'error_rate',
          severity: 'high',
          message: `Low verification success rate: ${metrics.successRate}%`,
          details: {
            successRate: metrics.successRate,
            totalSessions: metrics.totalSessions,
            approvedSessions: metrics.last24Hours.approved,
          },
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check processing time
      if (metrics.averageProcessingTime > 30 * 60 * 1000) { // 30 minutes
        alerts.push({
          id: crypto.randomUUID(),
          type: 'processing_time',
          severity: 'medium',
          message: `High average processing time: ${Math.round(metrics.averageProcessingTime / 60000)} minutes`,
          details: {
            averageProcessingTime: metrics.averageProcessingTime,
            totalSessions: metrics.totalSessions,
          },
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check for stuck sessions
      const healthChecks = await this.performHealthCheck();
      const stuckSessions = healthChecks.filter(h => h.status === 'error');

      if (stuckSessions.length > 0) {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'api_failure',
          severity: 'high',
          message: `${stuckSessions.length} verification sessions are stuck`,
          details: {
            stuckSessions: stuckSessions.map(s => ({
              sessionId: s.sessionId,
              userId: s.userId,
              issues: s.issues,
            })),
          },
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check for API sync failures
      const apiFailures = healthChecks.filter(h => h.apiSyncStatus === 'failed');
      if (apiFailures.length > 0) {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'api_failure',
          severity: 'medium',
          message: `${apiFailures.length} sessions have API sync failures`,
          details: {
            apiFailures: apiFailures.map(s => ({
              sessionId: s.sessionId,
              userId: s.userId,
            })),
          },
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }

      console.log(`✅ Generated ${alerts.length} alerts`);
      return alerts;

    } catch (error) {
      console.error('❌ Error generating alerts:', error);
      throw error;
    }
  }

  /**
   * Store alerts in database
   */
  static async storeAlerts(alerts: VerificationAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    console.log(`💾 Storing ${alerts.length} alerts...`);

    try {
      const { error } = await this.supabase
        .from('verification_alerts')
        .insert(alerts);

      if (error) {
        throw new Error(`Failed to store alerts: ${error.message}`);
      }

      console.log('✅ Alerts stored successfully');

    } catch (error) {
      console.error('❌ Error storing alerts:', error);
      throw error;
    }
  }

  /**
   * Get recent alerts
   */
  static async getRecentAlerts(limit: number = 50): Promise<VerificationAlert[]> {
    try {
      const { data: alerts, error } = await this.supabase
        .from('verification_alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch alerts: ${error.message}`);
      }

      return alerts || [];

    } catch (error) {
      console.error('❌ Error fetching alerts:', error);
      throw error;
    }
  }

  /**
   * Resolve alert
   */
  static async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('verification_alerts')
        .update({
          resolved: true,
          resolvedAt: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) {
        throw new Error(`Failed to resolve alert: ${error.message}`);
      }

      console.log(`✅ Alert ${alertId} resolved`);

    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive monitoring check
   */
  static async runMonitoringCheck(): Promise<{
    metrics: VerificationSessionMetrics;
    healthChecks: SessionHealthCheck[];
    alerts: VerificationAlert[];
  }> {
    console.log('🔍 Running comprehensive monitoring check...');

    try {
      const [metrics, healthChecks, alerts] = await Promise.all([
        this.getVerificationMetrics(),
        this.performHealthCheck(),
        this.generateAlerts(),
      ]);

      // Store alerts
      await this.storeAlerts(alerts);

      console.log('✅ Monitoring check completed:', {
        totalSessions: metrics.totalSessions,
        healthChecks: healthChecks.length,
        alerts: alerts.length,
      });

      return {
        metrics,
        healthChecks,
        alerts,
      };

    } catch (error) {
      console.error('❌ Error running monitoring check:', error);
      throw error;
    }
  }

  /**
   * Get verification dashboard data
   */
  static async getDashboardData(): Promise<{
    metrics: VerificationSessionMetrics;
    recentAlerts: VerificationAlert[];
    healthSummary: {
      total: number;
      healthy: number;
      warning: number;
      error: number;
    };
  }> {
    try {
      const [metrics, recentAlerts, healthChecks] = await Promise.all([
        this.getVerificationMetrics(),
        this.getRecentAlerts(10),
        this.performHealthCheck(),
      ]);

      const healthSummary = {
        total: healthChecks.length,
        healthy: healthChecks.filter(h => h.status === 'healthy').length,
        warning: healthChecks.filter(h => h.status === 'warning').length,
        error: healthChecks.filter(h => h.status === 'error').length,
      };

      return {
        metrics,
        recentAlerts,
        healthSummary,
      };

    } catch (error) {
      console.error('❌ Error getting dashboard data:', error);
      throw error;
    }
  }
}

