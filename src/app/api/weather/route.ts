import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { WeatherService } from '@/lib/weather-service';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get weather data for both bases
    const baseWeather = await WeatherService.getBaseWeather();
    
    return NextResponse.json({
      weather: baseWeather,
      summary: WeatherService.getWeatherSummary(baseWeather),
      status: WeatherService.getWeatherStatus(baseWeather),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching weather:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch weather data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
