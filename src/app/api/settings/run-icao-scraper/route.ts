import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    const decoded = AuthService.verifyToken(token);
    if (!decoded || !decoded.roles.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const scraperPath = path.join(process.cwd(), 'scripts', 'scrape-icao-comprehensive-v8.js');
    return await new Promise((resolve) => {
      const proc = spawn('node', [scraperPath]);
      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({ success: true, output }));
        } else {
          resolve(NextResponse.json({ error: 'Scraper failed', output }, { status: 500 }));
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to run scraper' }, { status: 500 });
  }
} 