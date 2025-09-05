import { getSupabaseClient } from './supabase';
import { EmailService } from './email-service';
import crypto from 'crypto';

export interface PasswordSetupToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  updated_at: string;
}

const emailService = new EmailService();

export class PasswordSetupService {
  static async generateSetupToken(userId: string, email: string, userName: string, lastName?: string): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed.' };
      }

      // Generate secure random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Store token in database
      const { error: tokenError } = await supabase
        .from('password_setup_tokens')
        .insert({
          user_id: userId,
          token,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (tokenError) {
        console.error('Error storing setup token:', tokenError);
        return { success: false, message: 'Failed to generate setup token.' };
      }

      // Send email
      const emailSent = await emailService.sendPasswordSetupEmail(email, token, userName, lastName);

      if (!emailSent) {
        return { success: false, message: 'Failed to send setup email.' };
      }

      return { success: true, message: 'Password setup email sent successfully.' };
    } catch (error) {
      console.error('Error generating setup token:', error);
      return { success: false, message: 'An error occurred while processing your request.' };
    }
  }

  static async validateSetupToken(token: string): Promise<{ valid: boolean; userId?: string; message: string }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { valid: false, message: 'Database connection failed.' };
      }

      // Find token in database
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_setup_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (tokenError || !tokenData) {
        return { valid: false, message: 'Invalid or expired setup token.' };
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now > expiresAt) {
        return { valid: false, message: 'Setup token has expired.' };
      }

      return { valid: true, userId: tokenData.user_id, message: 'Token is valid.' };
    } catch (error) {
      console.error('Error validating setup token:', error);
      return { valid: false, message: 'An error occurred while validating the token.' };
    }
  }

  static async completePasswordSetup(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed.' };
      }

      // Validate token first
      const tokenValidation = await this.validateSetupToken(token);
      if (!tokenValidation.valid) {
        return { success: false, message: tokenValidation.message };
      }

      const userId = tokenValidation.userId!;

      // Hash the new password
      const { AuthService } = await import('@/lib/auth');
      const hashedPassword = await AuthService.hashPassword(newPassword);

      // Update user password and requiresPasswordSetup flag
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          requiresPasswordSetup: false,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user password:', updateError);
        return { success: false, message: 'Failed to update password.' };
      }

      // Mark token as used
      const { error: tokenUpdateError } = await supabase
        .from('password_setup_tokens')
        .update({ used: true, updated_at: new Date().toISOString() })
        .eq('token', token);

      if (tokenUpdateError) {
        console.error('Error marking token as used:', tokenUpdateError);
        // Don't fail the operation, just log the error
      }

      return { success: true, message: 'Password set up successfully. You can now log in with your new password.' };
    } catch (error) {
      console.error('Error completing password setup:', error);
      return { success: false, message: 'An error occurred while setting up your password.' };
    }
  }

  static async cleanupExpiredTokens(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return;
      }

      const now = new Date().toISOString();
      
      // Delete expired tokens
      const { error } = await supabase
        .from('password_setup_tokens')
        .delete()
        .lt('expires_at', now);

      if (error) {
        console.error('Error cleaning up expired setup tokens:', error);
      } else {
        console.log('✅ Cleaned up expired password setup tokens');
      }
    } catch (error) {
      console.error('Error in cleanup expired tokens:', error);
    }
  }
}
