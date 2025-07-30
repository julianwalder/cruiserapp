import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSupabaseClient } from './supabase';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status: string;
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
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      const secret = process.env.JWT_SECRET!;
      return jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  static async updateLastLogin(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      await supabase
        .from('users')
        .update({ lastLoginAt: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Validate session (using JWT token)
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
      // Get user data from Supabase
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
        .eq('id', payload.userId)
        .single();
      if (error || !user) {
        return null;
      }
      return user as unknown as User;
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  // Create session (for backward compatibility - just return success)
  static async createSession(userId: string, token: string): Promise<void> {
    return Promise.resolve();
  }

  // Delete session (for backward compatibility - just return success)
  static async deleteSession(token: string): Promise<void> {
    return Promise.resolve();
  }

  // Check if user has permission (for backward compatibility)
  static hasPermission(userRoles: string[], requiredRole: string): boolean {
    const roleHierarchy = {
      PILOT: 1,
      STUDENT: 1,
      INSTRUCTOR: 2,
      BASE_MANAGER: 3,
      ADMIN: 4,
      SUPER_ADMIN: 5,
    };
    const userMaxLevel = Math.max(...userRoles.map(role => roleHierarchy[role as keyof typeof roleHierarchy] || 0));
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    return userMaxLevel >= requiredLevel;
  }

  // Check if user has a specific role
  static hasRole(userRoles: string[], roleName: string): boolean {
    return userRoles.includes(roleName);
  }
} 