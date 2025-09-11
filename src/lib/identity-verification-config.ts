/**
 * Identity Verification Configuration
 * 
 * Clean, simplified configuration for Stripe Identity verification.
 * No complex provider switching - just reliable identity verification.
 */

export interface IdentityVerificationConfig {
  provider: 'stripe';
  isStripeEnabled: boolean;
}

/**
 * Get the current identity verification configuration
 */
export function getIdentityVerificationConfig(): IdentityVerificationConfig {
  return {
    provider: 'stripe',
    isStripeEnabled: true,
  };
}

/**
 * Check if Stripe Identity is enabled (always true in clean integration)
 */
export function isStripeIdentityEnabled(): boolean {
  return true;
}

/**
 * Get the active provider name (always Stripe Identity)
 */
export function getActiveProvider(): 'stripe' {
  return 'stripe';
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(): string {
  return 'Stripe Identity';
}

/**
 * Environment variable validation
 */
export function validateIdentityVerificationConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Stripe configuration (required for clean integration)
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY is required for Stripe Identity');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required for Stripe Identity');
  }
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    errors.push('STRIPE_PUBLISHABLE_KEY is required for Stripe Identity');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Log configuration status (for debugging)
 */
export function logIdentityVerificationConfig(): void {
  const config = getIdentityVerificationConfig();
  const validation = validateIdentityVerificationConfig();
  
  console.log('🔧 Identity Verification Configuration:', {
    provider: config.provider,
    displayName: getProviderDisplayName(),
    isStripeEnabled: config.isStripeEnabled,
    isValid: validation.valid,
    errors: validation.errors
  });

  if (!validation.valid) {
    console.warn('⚠️ Identity Verification Configuration Issues:', validation.errors);
  }
}
