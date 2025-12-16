import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { AuthService } from '@/lib/auth';
import {
  calculateHeatmapData,
  calculateRoutes,
  calculateMapCenter,
  getCoordinatesArray,
  getTopRoutes,
  filterValidFlights,
} from '@/lib/heatmap-utils';

export async function GET(request: NextRequest) {
  try {
    logger.debug('🗺️ All users heatmap API called');

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

    // 2. Authorization - only admins can view all users' flights
    const userRoles = decoded.roles || [];
    const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');

    if (!isAdmin) {
      logger.security('Unauthorized all-users heatmap access attempt', {
        userId: decoded.userId,
      });
      return NextResponse.json(
        { error: 'Only administrators can view all users\' flights' },
        { status: 403 }
      );
    }

    // 3. Fetch all flight data
    const currentYear = new Date().getFullYear();
    const dateFrom = `${currentYear}-01-01`;
    const dateTo = `${currentYear}-12-31`;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const flightResponse = await fetch(
      `${baseUrl}/api/flight-logs?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=10000`,
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
    logger.debug(`📊 Fetched ${flightLogs.length} flight logs for all users`);

    // 4. Process data using heatmap-utils
    const validFlights = filterValidFlights(flightLogs);
    const airfields = calculateHeatmapData(validFlights);
    const routes = getTopRoutes(calculateRoutes(validFlights), 0); // 0 = show all routes
    const center = calculateMapCenter(airfields);
    const coordinates = getCoordinatesArray(airfields);

    logger.debug(
      `🗺️ Processed data: ${airfields.length} airfields, ${routes.length} routes`
    );

    if (airfields.length === 0) {
      return NextResponse.json(
        { error: 'No flights with valid coordinates found for this period' },
        { status: 404 }
      );
    }

    // 5. Return heatmap data
    return NextResponse.json({
      airfields,
      routes,
      center,
      coordinates,
    });
  } catch (error) {
    logger.error('All users heatmap fetch failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch heatmap data',
      },
      { status: 500 }
    );
  }
}
