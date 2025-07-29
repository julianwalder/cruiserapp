import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from './supabase';
import { emailService } from './email-service';

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PasswordResetService {
  static async generateResetToken(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed.' };
      }
      
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, firstName, lastName')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !user) {
        // Don't reveal if user exists or not for security
        return { success: true, message: 'If an account with that email exists, a password reset link has been sent.' };
      }

      // Generate secure random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store token in database
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (tokenError) {
        console.error('Error storing reset token:', tokenError);
        return { success: false, message: 'Failed to generate reset token.' };
      }

      // Send email
      const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
      const emailSent = await emailService.sendPasswordResetEmail(email, token, userName);

      if (!emailSent) {
        return { success: false, message: 'Failed to send reset email.' };
      }

      return { success: true, message: 'If an account with that email exists, a password reset link has been sent.' };
    } catch (error) {
      console.error('Error generating reset token:', error);
      return { success: false, message: 'An error occurred while processing your request.' };
    }
  }

  static async validateResetToken(token: string): Promise<{ valid: boolean; userId?: string; message: string }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { valid: false, message: 'Database connection failed.' };
      }
      
      // Find token in database
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (tokenError || !tokenData) {
        return { valid: false, message: 'Invalid or expired reset token.' };
      }

      // Check if token is expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, message: 'Reset token has expired.' };
      }

      return { valid: true, userId: tokenData.user_id, message: 'Token is valid.' };
    } catch (error) {
      console.error('Error validating reset token:', error);
      return { valid: false, message: 'An error occurred while validating the token.' };
    }
  }

  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed.' };
      }
      
      // Validate token
      const validation = await this.validateResetToken(token);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', validation.userId);

      if (updateError) {
        console.error('Error updating password:', updateError);
        return { success: false, message: 'Failed to update password.' };
      }

      // Mark token as used
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

      if (tokenError) {
        console.error('Error marking token as used:', tokenError);
        // Don't fail the password reset if we can't mark the token as used
      }

      // Get user details for confirmation email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, firstName, lastName')
        .eq('id', validation.userId)
        .single();

      if (!userError && user) {
        const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
        await emailService.sendPasswordChangedEmail(user.email, userName);
      }

      return { success: true, message: 'Password reset successfully. You can now log in with your new password.' };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, message: 'An error occurred while resetting your password.' };
    }
  }

  static async cleanupExpiredTokens(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return;
      }
      
      // Delete expired tokens
      await supabase
        .from('password_reset_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return;
      }
      
      // Mark all user's tokens as used
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error revoking user tokens:', error);
    }
  }
} 