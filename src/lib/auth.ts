import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
}

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  static generateToken(payload: JWTPayload): string {
    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload | null {
    try {
      const secret = process.env.JWT_SECRET!;
      const decoded = jwt.verify(token, secret) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Create session
  static async createSession(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  // Validate session
  static async validateSession(token: string): Promise<User | null> {
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    return session?.user || null;
  }

  // Delete session
  static async deleteSession(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        token,
      },
    });
  }

  // Check if user has permission (for backward compatibility)
  static hasPermission(userRoles: string[], requiredRole: string): boolean {
    const roleHierarchy = {
      PILOT: 1,
      STUDENT: 1,
      INSTRUCTOR: 2,
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