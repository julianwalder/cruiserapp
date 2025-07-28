import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// GET /api/users/import-summary - Get import summary
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has appropriate permissions
    if (!AuthService.hasPermission(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Read the import summary from the JSON file
    const summaryFilePath = path.join(process.cwd(), 'data', 'users-import-summary.json');
    
    try {
      const summaryData = fs.readFileSync(summaryFilePath, 'utf8');
      const summary = JSON.parse(summaryData);
      
      return NextResponse.json(summary);
    } catch (fileError) {
      // If file doesn't exist or is invalid, return null
      console.log('No import summary file found or invalid JSON');
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('Error fetching import summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 