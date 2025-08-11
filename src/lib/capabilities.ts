import { getSupabaseClient } from './supabase';

export interface Capability {
  capability_name: string;
  resource_type: string;
  resource_name: string;
  action: string;
  description: string;
}

export class CapabilityService {
  /**
   * Check if a user has a specific capability
   */
  static async hasCapability(userId: string, capabilityName: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return false;
      }

      const { data, error } = await supabase.rpc('has_capability', {
        user_id: userId,
        capability_name: capabilityName
      });

      if (error) {
        console.error('Error checking capability:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error in hasCapability:', error);
      return false;
    }
  }

  /**
   * Get all capabilities for a user
   */
  static async getUserCapabilities(userId: string): Promise<Capability[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return [];
      }

      const { data, error } = await supabase.rpc('get_user_capabilities', {
        user_id: userId
      });

      if (error) {
        console.error('Error fetching user capabilities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserCapabilities:', error);
      return [];
    }
  }

  /**
   * Check if user can access a specific menu item
   */
  static async canAccessMenu(userId: string, menuPath: string): Promise<boolean> {
    const capabilityName = `${menuPath.replace('/', '')}.view`;
    return this.hasCapability(userId, capabilityName);
  }

  /**
   * Check if user can perform an action on a resource
   */
  static async canPerformAction(userId: string, resourceName: string, action: string): Promise<boolean> {
    const capabilityName = `${resourceName}.${action}`;
    return this.hasCapability(userId, capabilityName);
  }

  /**
   * Check if user can access data
   */
  static async canAccessData(userId: string, dataType: string, action: string): Promise<boolean> {
    const capabilityName = `data.${dataType}.${action}`;
    return this.hasCapability(userId, capabilityName);
  }

  /**
   * Check if user can access API
   */
  static async canAccessApi(userId: string, apiName: string, action: string): Promise<boolean> {
    const capabilityName = `api.${apiName}.${action}`;
    return this.hasCapability(userId, capabilityName);
  }

  /**
   * Get user's menu access capabilities
   */
  static async getMenuCapabilities(userId: string): Promise<Capability[]> {
    const capabilities = await this.getUserCapabilities(userId);
    return capabilities.filter(cap => cap.resource_type === 'menu');
  }

  /**
   * Get user's data access capabilities
   */
  static async getDataCapabilities(userId: string): Promise<Capability[]> {
    const capabilities = await this.getUserCapabilities(userId);
    return capabilities.filter(cap => cap.resource_type === 'data');
  }

  /**
   * Get user's API access capabilities
   */
  static async getApiCapabilities(userId: string): Promise<Capability[]> {
    const capabilities = await this.getUserCapabilities(userId);
    return capabilities.filter(cap => cap.resource_type === 'api');
  }

  /**
   * Check if user has admin privileges
   */
  static async isAdmin(userId: string): Promise<boolean> {
    return this.hasCapability(userId, 'admin.access');
  }

  /**
   * Check if user has super admin privileges
   */
  static async isSuperAdmin(userId: string): Promise<boolean> {
    return this.hasCapability(userId, 'super_admin.access');
  }
}

// Client-side capability checking (for UI components)
export class ClientCapabilityService {
  private static capabilities: Capability[] = [];
  private static userId: string | null = null;

  /**
   * Initialize capabilities for the current user
   */
  static async initialize(userId: string): Promise<void> {
    this.userId = userId;
    this.capabilities = await CapabilityService.getUserCapabilities(userId);
  }

  /**
   * Check if current user has a capability (client-side)
   */
  static hasCapability(capabilityName: string): boolean {
    return this.capabilities.some(cap => cap.capability_name === capabilityName);
  }

  /**
   * Check if current user can access a menu item (client-side)
   */
  static canAccessMenu(menuPath: string): boolean {
    const capabilityName = `${menuPath.replace('/', '')}.view`;
    return this.hasCapability(capabilityName);
  }

  /**
   * Check if current user can perform an action (client-side)
   */
  static canPerformAction(resourceName: string, action: string): boolean {
    const capabilityName = `${resourceName}.${action}`;
    return this.hasCapability(capabilityName);
  }

  /**
   * Get all capabilities for current user (client-side)
   */
  static getCapabilities(): Capability[] {
    return [...this.capabilities];
  }

  /**
   * Clear cached capabilities (for logout)
   */
  static clear(): void {
    this.capabilities = [];
    this.userId = null;
  }
}

// React hook for capability checking
export function useCapabilities() {
  return {
    hasCapability: ClientCapabilityService.hasCapability.bind(ClientCapabilityService),
    canAccessMenu: ClientCapabilityService.canAccessMenu.bind(ClientCapabilityService),
    canPerformAction: ClientCapabilityService.canPerformAction.bind(ClientCapabilityService),
    getCapabilities: ClientCapabilityService.getCapabilities.bind(ClientCapabilityService),
    initialize: ClientCapabilityService.initialize.bind(ClientCapabilityService),
    clear: ClientCapabilityService.clear.bind(ClientCapabilityService)
  };
}
