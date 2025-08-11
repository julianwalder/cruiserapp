import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getSupabaseClient } from './supabase';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  jti?: string; // JWT ID for token tracking
  iss?: string; // issuer
  aud?: string; // audience
  sub?: string; // subject
  nbf?: number; // not before
  iat?: number; // issued at
}

export interface RefreshTokenPayload {
  tokenId: string;
  userId: string;
  jti: string; // JWT ID of the access token
}

import { User } from "@/types/uuid-types";

// Extended User interface for auth with user_roles
interface AuthUser extends User {
  user_roles: Array<{
    roles: {
      name: string;
    };
  }>;
}

export class AuthService {
  static async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return null;
      }
      // Query user with roles using Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          "firstName",
          "lastName",
          password,
          status,
          user_roles!user_roles_userId_fkey (
            roles (
              name
            )
          )
        `)
        .eq('email', email)
        .single();
      if (error || !user) {
        console.log('User not found or error:', error);
        return null;
      }
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log('Invalid password for user:', email);
        return null;
      }
      return user as unknown as User;
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  static generateToken(payload: JWTPayload): string {
    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h'; // Reduced from 7d to 24h
    const now = Math.floor(Date.now() / 1000);
    
    // Generate unique JWT ID for token tracking
    const jti = crypto.randomUUID();
    
    // Include standard JWT claims in the payload
    const tokenPayload = {
      ...payload,
      jti,
      iss: 'cruiser-aviation',
      aud: 'cruiser-app',
      sub: payload.userId,
      nbf: now,
      iat: now
    };
    
    return jwt.sign(tokenPayload, secret, { 
      expiresIn: expiresIn as any
    });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      const secret = process.env.JWT_SECRET!;
      const payload = jwt.verify(token, secret, {
        issuer: 'cruiser-aviation',
        audience: 'cruiser-app'
      }) as JWTPayload;
      
      // Additional validation
      if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
        console.error('Token not yet valid (nbf check failed)');
        return null;
      }
      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Generate refresh token
  static async generateRefreshToken(userId: string, accessTokenJti: string, userAgent?: string, ipAddress?: string): Promise<string> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Generate a cryptographically secure refresh token
      const refreshToken = crypto.randomBytes(64).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      // Set refresh token expiration (30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Store refresh token in database
      const { error } = await supabase
        .from('refresh_tokens')
        .insert({
          "userId": userId,
          token_hash: tokenHash,
          "accessTokenId": accessTokenJti,
          "expiresAt": expiresAt.toISOString(),
          "userAgent": userAgent,
          "ipAddress": ipAddress,
          "deviceInfo": {
            userAgent,
            ipAddress,
            createdAt: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Error storing refresh token:', error);
        throw new Error('Failed to store refresh token');
      }

      return refreshToken;
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw error;
    }
  }

  // Validate refresh token and return new access token
  static async refreshAccessToken(refreshToken: string, userId: string): Promise<{ accessToken: string; newRefreshToken: string } | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Hash the refresh token for database lookup
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Validate refresh token
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_refresh_token', {
          token_hash_param: tokenHash,
          user_id_param: userId
        });

      if (validationError || !validationResult || validationResult.length === 0) {
        console.error('Refresh token validation failed:', validationError);
        return null;
      }

      const tokenData = validationResult[0];
      if (!tokenData.is_valid) {
        console.error('Refresh token is invalid or expired');
        return null;
      }

      // Get user data for new token
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          "firstName",
          "lastName",
          status,
          user_roles!user_roles_userId_fkey (
            roles (
              name
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Error fetching user data:', userError);
        return null;
      }

      // Extract roles
      const roles = (user as any).user_roles?.map((ur: any) => ur.roles.name) || [];

      // Generate new access token
      const newAccessToken = this.generateToken({
        userId: user.id,
        email: user.email,
        roles
      });

      // Revoke the old refresh token (token rotation)
      await supabase.rpc('revoke_refresh_token', {
        token_hash_param: tokenHash,
        revoke_reason: 'Token rotation'
      });

      // Generate new refresh token
      const newRefreshToken = await this.generateRefreshToken(
        userId, 
        (this.verifyToken(newAccessToken) as JWTPayload).jti!,
        tokenData.userAgent,
        tokenData.ipAddress
      );

      return {
        accessToken: newAccessToken,
        newRefreshToken
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }

  // Revoke all refresh tokens for a user
  static async revokeAllUserTokens(userId: string, reason: string = 'User session termination'): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.rpc('revoke_user_refresh_tokens', {
        target_user_id: userId,
        revoke_reason: reason
      });

      if (error) {
        console.error('Error revoking user tokens:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Error revoking all user tokens:', error);
      throw error;
    }
  }

  // Revoke specific refresh token
  static async revokeRefreshToken(refreshToken: string, reason: string = 'Token revocation'): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const { data, error } = await supabase.rpc('revoke_refresh_token', {
        token_hash_param: tokenHash,
        revoke_reason: reason
      });

      if (error) {
        console.error('Error revoking refresh token:', error);
        throw error;
      }

      return data || false;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  // Get user's active refresh tokens
  static async getUserRefreshTokens(userId: string): Promise<any[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('refresh_tokens')
        .select('*')
        .eq('userId', userId)
        .is('revokedAt', null)
        .gt('expiresAt', new Date().toISOString())
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching user refresh tokens:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user refresh tokens:', error);
      throw error;
    }
  }

  static async updateLastLogin(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ "lastLoginAt": new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error updating last login:', error);
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async validateSession(token: string): Promise<User | null> {
    try {
      const payload = this.verifyToken(token);
      if (!payload) {
        return null;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return null;
      }

      // Get user data with roles
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          "firstName",
          "lastName",
          status,
          "lastLoginAt",
          user_roles!user_roles_userId_fkey (
            roles (
              name
            )
          )
        `)
        .eq('id', payload.userId)
        .eq('status', 'ACTIVE')
        .single();

      if (error || !user) {
        console.error('User not found or inactive:', error);
        return null;
      }

      return user as unknown as User;
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  static async createSession(userId: string, token: string): Promise<void> {
    // This method is now handled by refresh token system
    console.log('Session creation is now handled by refresh token system');
  }

  static async deleteSession(token: string): Promise<void> {
    // This method is now handled by refresh token system
    console.log('Session deletion is now handled by refresh token system');
  }

  static hasPermission(userRoles: string[], requiredRole: string): boolean {
    const roleHierarchy: { [key: string]: number } = {
      'USER': 1,
      'PROSPECT': 1,
      'INSTRUCTOR': 2,
      'ADMIN': 3,
      'SUPER_ADMIN': 4
    };

    const requiredLevel = roleHierarchy[requiredRole] || 0;
    const userMaxLevel = Math.max(...userRoles.map(role => roleHierarchy[role] || 0));

    return userMaxLevel >= requiredLevel;
  }

  static hasRole(userRoles: string[], roleName: string): boolean {
    return userRoles.includes(roleName);
  }
} 