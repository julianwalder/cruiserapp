import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { AuthService } from '@/lib/auth';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  calculateHeatmapData,
  calculateRoutes,
  calculateMapCenter,
  getCoordinatesArray,
  getTopRoutes,
  filterValidFlights,
} from '@/lib/heatmap-utils';

// Request validation schema
const RenderRequestSchema = z.object({
  userId: z.string().uuid(),
  year: z.string().regex(/^\d{4}$/),
  format: z.enum(['png', 'jpg']).optional().default('png'),
  width: z.number().min(400).max(2400).optional().default(1200),
  height: z.number().min(300).max(1800).optional().default(800),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let browser;

  try {
    logger.debug('🖼️ Heatmap render API called');

    // 1. Authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      logger.debug('❌ No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      logger.debug('❌ Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validated = RenderRequestSchema.parse(body);
    const { userId, year, format, width, height } = validated;

    logger.debug('🔍 Rendering heatmap:', { userId, year, format, width, height });

    // 3. Authorization - users can only export their own heatmaps
    // (Admins can export any user's heatmap)
    const userRoles = decoded.roles || [];
    const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');

    if (!isAdmin && decoded.userId !== userId) {
      logger.security('Unauthorized heatmap access attempt', {
        requestedBy: decoded.userId,
        requestedUserId: userId,
      });
      return NextResponse.json(
        { error: 'You can only export your own heatmaps' },
        { status: 403 }
      );
    }

    // 4. Fetch flight data
    const dateFrom = `${year}-01-01`;
    const dateTo = `${year}-12-31`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const flightResponse = await fetch(
      `${baseUrl}/api/flight-logs?userId=${userId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=10000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!flightResponse.ok) {
      throw new Error(`Failed to fetch flight data: ${flightResponse.statusText}`);
    }

    const { flightLogs } = await flightResponse.json();
    logger.debug(`📊 Fetched ${flightLogs.length} flight logs`);

    // 5. Process data using heatmap-utils
    const validFlights = filterValidFlights(flightLogs);
    const airfields = calculateHeatmapData(validFlights);
    const routes = getTopRoutes(calculateRoutes(validFlights), 0); // 0 = show all routes
    const center = calculateMapCenter(airfields);
    const coordinates = getCoordinatesArray(airfields);

    logger.debug(`🗺️ Processed data: ${airfields.length} airfields, ${routes.length} routes`);

    if (airfields.length === 0) {
      return NextResponse.json(
        { error: 'No flights with valid coordinates found for this period' },
        { status: 404 }
      );
    }

    // 6. Load and prepare HTML template
    const templatePath = path.join(
      process.cwd(),
      'src/app/api/heatmaps/templates/standalone-map.html'
    );

    let html = fs.readFileSync(templatePath, 'utf-8');

    // Replace template placeholders with actual data
    html = html
      .replace('{{AIRFIELDS_JSON}}', JSON.stringify(airfields))
      .replace('{{ROUTES_JSON}}', JSON.stringify(routes))
      .replace('{{CENTER_JSON}}', JSON.stringify(center))
      .replace('{{COORDINATES_JSON}}', JSON.stringify(coordinates));

    // 7. Launch Puppeteer and render
    logger.debug('🚀 Launching Puppeteer browser');

    // Use chromium for serverless environments (Vercel), fallback to local Chrome for development
    const isProduction = process.env.NODE_ENV === 'production';

    browser = await puppeteer.launch({
      args: isProduction ? chromium.args : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
      executablePath: isProduction
        ? await chromium.executablePath()
        : process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      headless: true,
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width, height });

    // Navigate to data URI
    const dataUri = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
    await page.goto(dataUri, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for map to be ready
    logger.debug('⏳ Waiting for map to render');
    await page.waitForFunction(() => (window as any).mapReady === true, {
      timeout: 15000,
    });

    // Additional wait for tiles to finish rendering
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot
    logger.debug('📸 Taking screenshot');
    const screenshot = await page.screenshot({
      type: format === 'jpg' ? 'jpeg' : 'png',
      quality: format === 'jpg' ? 90 : undefined,
      fullPage: false,
    });

    await browser.close();
    browser = undefined;

    const duration = Date.now() - startTime;

    logger.info('Heatmap rendered successfully', {
      userId,
      year,
      format,
      flightCount: validFlights.length,
      airfieldCount: airfields.length,
      routeCount: routes.length,
      duration: `${duration}ms`,
    });

    // 8. Return image with download headers
    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': format === 'jpg' ? 'image/jpeg' : 'image/png',
        'Content-Disposition': `attachment; filename="flight-heatmap-${year}.${format}"`,
        'Cache-Control': 'public, max-age=604800', // 7 days
      },
    });
  } catch (error) {
    // Clean up browser if it's still running
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        logger.error('Failed to close browser', { error: closeError });
      }
    }

    logger.error('Heatmap render failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to render heatmap',
      },
      { status: 500 }
    );
  }
}
