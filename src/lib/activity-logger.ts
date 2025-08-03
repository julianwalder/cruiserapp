import { getSupabaseClient } from './supabase';

export interface ActivityLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityLogger {
  static async log(data: ActivityLogData): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not available for activity logging');
        return;
      }

      const { error } = await supabase
        .from('activity_log')
        .insert({
          user_id: data.userId,
          action: data.action,
          entity_type: data.entityType,
          entity_id: data.entityId,
          description: data.description,
          metadata: data.metadata,
          ip_address: data.ipAddress,
          user_agent: data.userAgent
        });

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (error) {
      console.error('Error in ActivityLogger.log:', error);
    }
  }

  // Convenience methods for common activities
  static async logUserLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: userId,
      description: 'User logged in successfully',
      metadata: { ip: ipAddress },
      ipAddress,
      userAgent
    });
  }

  static async logUserLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'USER_LOGOUT',
      entityType: 'user',
      entityId: userId,
      description: 'User logged out',
      metadata: { ip: ipAddress },
      ipAddress,
      userAgent
    });
  }

  static async logUserRegistration(userId: string, email: string, role?: string): Promise<void> {
    await this.log({
      userId,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: userId,
      description: `New user registered: ${email}`,
      metadata: { email, role }
    });
  }

  static async logUserUpdate(userId: string, updatedBy: string, changes: Record<string, any>): Promise<void> {
    await this.log({
      userId: updatedBy,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: userId,
      description: 'User profile updated',
      metadata: { updatedUserId: userId, changes }
    });
  }

  static async logRoleUpdate(userId: string, updatedBy: string, oldRole: string, newRole: string): Promise<void> {
    await this.log({
      userId: updatedBy,
      action: 'ROLE_UPDATED',
      entityType: 'user',
      entityId: userId,
      description: `User role updated from ${oldRole} to ${newRole}`,
      metadata: { updatedUserId: userId, oldRole, newRole }
    });
  }

  static async logFlightCreated(userId: string, flightId: string, aircraftId?: string): Promise<void> {
    await this.log({
      userId,
      action: 'FLIGHT_CREATED',
      entityType: 'flight_log',
      entityId: flightId,
      description: 'Flight log created',
      metadata: { aircraftId }
    });
  }

  static async logFlightUpdated(userId: string, flightId: string, changes: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: 'FLIGHT_UPDATED',
      entityType: 'flight_log',
      entityId: flightId,
      description: 'Flight log updated',
      metadata: { changes }
    });
  }

  static async logFlightDeleted(userId: string, flightId: string): Promise<void> {
    await this.log({
      userId,
      action: 'FLIGHT_DELETED',
      entityType: 'flight_log',
      entityId: flightId,
      description: 'Flight log deleted'
    });
  }

  static async logAircraftAdded(userId: string, aircraftId: string, registration: string): Promise<void> {
    await this.log({
      userId,
      action: 'AIRCRAFT_ADDED',
      entityType: 'aircraft',
      entityId: aircraftId,
      description: `Aircraft added: ${registration}`,
      metadata: { registration }
    });
  }

  static async logAircraftUpdated(userId: string, aircraftId: string, changes: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: 'AIRCRAFT_UPDATED',
      entityType: 'aircraft',
      entityId: aircraftId,
      description: 'Aircraft updated',
      metadata: { changes }
    });
  }

  static async logAircraftDeleted(userId: string, aircraftId: string, registration: string): Promise<void> {
    await this.log({
      userId,
      action: 'AIRCRAFT_DELETED',
      entityType: 'aircraft',
      entityId: aircraftId,
      description: `Aircraft removed: ${registration}`,
      metadata: { registration }
    });
  }

  static async logAirfieldAdded(userId: string, airfieldId: string, icaoCode: string): Promise<void> {
    await this.log({
      userId,
      action: 'AIRFIELD_ADDED',
      entityType: 'airfield',
      entityId: airfieldId,
      description: `Airfield added: ${icaoCode}`,
      metadata: { icaoCode }
    });
  }

  static async logAirfieldUpdated(userId: string, airfieldId: string, changes: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: 'AIRFIELD_UPDATED',
      entityType: 'airfield',
      entityId: airfieldId,
      description: 'Airfield updated',
      metadata: { changes }
    });
  }

  static async logAirfieldDeleted(userId: string, airfieldId: string, icaoCode: string): Promise<void> {
    await this.log({
      userId,
      action: 'AIRFIELD_DELETED',
      entityType: 'airfield',
      entityId: airfieldId,
      description: `Airfield removed: ${icaoCode}`,
      metadata: { icaoCode }
    });
  }

  static async logInvoiceCreated(userId: string, invoiceId: string, amount: number, currency: string): Promise<void> {
    await this.log({
      userId,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: invoiceId,
      description: `Invoice created: ${amount} ${currency}`,
      metadata: { amount, currency }
    });
  }

  static async logInvoiceUpdated(userId: string, invoiceId: string, changes: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: 'INVOICE_UPDATED',
      entityType: 'invoice',
      entityId: invoiceId,
      description: 'Invoice updated',
      metadata: { changes }
    });
  }

  static async logInvoiceDeleted(userId: string, invoiceId: string): Promise<void> {
    await this.log({
      userId,
      action: 'INVOICE_DELETED',
      entityType: 'invoice',
      entityId: invoiceId,
      description: 'Invoice deleted'
    });
  }

  static async logSystemEvent(action: string, description: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      action,
      entityType: 'system',
      description,
      metadata
    });
  }

  static async logDatabaseMigration(migrationType: string, tablesUpdated: number): Promise<void> {
    await this.log({
      action: 'DATABASE_MIGRATION',
      entityType: 'system',
      description: `${migrationType} migration completed successfully`,
      metadata: { migrationType, tablesUpdated }
    });
  }

  static async logSettingsUpdate(userId: string, setting: string, value: any): Promise<void> {
    await this.log({
      userId,
      action: 'SETTINGS_UPDATED',
      entityType: 'system',
      description: `Setting updated: ${setting}`,
      metadata: { setting, value }
    });
  }
} 