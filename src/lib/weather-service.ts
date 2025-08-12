export interface WeatherData {
  icao: string;
  name: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  ceiling: number;
  conditions: string;
  rawMetar: string;
  timestamp: string;
}

export interface BaseWeather {
  strejnic: WeatherData | null;
  dezmir: WeatherData | null;
}

export class WeatherService {
  private static checkWxApiKey = process.env.CHECKWX_API_KEY;
  private static baseUrl = 'https://api.checkwx.com';

  // ICAO codes for the bases
  private static readonly STREJNIC_ICAO = 'LRPW'; // Strejnic Airfield
  private static readonly DEZMIR_ICAO = 'LRCJ';   // Dezmir Airfield
  private static readonly STREJNIC_BACKUP = 'LROP'; // Otopeni/Bucharest Airport (closest to Strejnic)
  private static readonly DEZMIR_BACKUP = 'LRCL';  // Cluj-Napoca Airport (closest to Dezmir)

  /**
   * Get weather data for both bases
   */
  static async getBaseWeather(): Promise<BaseWeather> {
    if (!this.checkWxApiKey) {
      console.log('CheckWX API key not configured');
      return { strejnic: null, dezmir: null };
    }

    try {
      // Try to get weather for both bases, with specific fallbacks for each
      // Add timeout to prevent hanging
      const weatherPromise = Promise.allSettled([
        this.getWeatherForAirfield(this.STREJNIC_ICAO),
        this.getWeatherForAirfield(this.DEZMIR_ICAO),
        this.getWeatherForAirfield(this.STREJNIC_BACKUP),
        this.getWeatherForAirfield(this.DEZMIR_BACKUP)
      ]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Weather API timeout')), 10000)
      );

      const [strejnicWeather, dezmirWeather, strejnicBackup, dezmirBackup] = await Promise.race([
        weatherPromise,
        timeoutPromise
      ]) as PromiseSettledResult<WeatherData | null>[];



      // Use specific backup weather for each base
      const strejnic = (strejnicWeather.status === 'fulfilled' && strejnicWeather.value) ? strejnicWeather.value : 
                      (strejnicBackup.status === 'fulfilled' && strejnicBackup.value) ? strejnicBackup.value : null;
      
      const dezmir = (dezmirWeather.status === 'fulfilled' && dezmirWeather.value) ? dezmirWeather.value : 
                    (dezmirBackup.status === 'fulfilled' && dezmirBackup.value) ? dezmirBackup.value : null;



      return { strejnic, dezmir };
    } catch (error) {
      console.error('Error fetching base weather:', error);
      return { strejnic: null, dezmir: null };
    }
  }

  /**
   * Get weather data for a specific airfield
   */
  private static async getWeatherForAirfield(icao: string): Promise<WeatherData | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.baseUrl}/metar/${icao}/decoded`, {
        headers: {
          'X-API-Key': this.checkWxApiKey,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`CheckWX API error for ${icao}:`, response.status);
        return null;
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        console.log(`No weather data available for ${icao}`);
        return null;
      }

      const metar = data.data[0];
      

      
      return {
        icao: metar.icao,
        name: metar.station?.name || icao,
        temperature: metar.temperature?.celsius || 0,
        windSpeed: metar.wind?.speed_kts || 0,
        windDirection: metar.wind?.degrees || 0,
        visibility: metar.visibility?.meters || 0,
        ceiling: metar.clouds?.[0]?.base_feet_agl || 0,
        conditions: this.getConditionsDescription(metar),
        rawMetar: metar.raw_text || '',
        timestamp: metar.observed || new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Weather API timeout for ${icao}`);
      } else {
        console.error(`Error fetching weather for ${icao}:`, error);
      }
      return null;
    }
  }

  /**
   * Get a human-readable description of weather conditions
   */
  private static getConditionsDescription(metar: any): string {
    const conditions = [];

    // Temperature
    if (metar.temperature?.celsius !== undefined) {
      conditions.push(`${metar.temperature.celsius}°C`);
    }

    // Wind
    if (metar.wind?.speed_kts && metar.wind?.degrees) {
      conditions.push(`${metar.wind.speed_kts}kt wind from ${metar.wind.degrees}°`);
    }

    // Visibility
    if (metar.visibility?.meters) {
      const visibilityKm = Math.round(metar.visibility.meters / 1000);
      conditions.push(`${visibilityKm}km visibility`);
    }

    // Ceiling
    if (metar.clouds?.[0]?.base_feet_agl) {
      const ceilingM = Math.round(metar.clouds[0].base_feet_agl * 0.3048);
      conditions.push(`${ceilingM}m ceiling`);
    }

    // Weather phenomena
    if (metar.wx_codes && metar.wx_codes.length > 0) {
      const wxDescriptions = metar.wx_codes.map((wx: any) => wx.description).join(', ');
      conditions.push(wxDescriptions);
    }

    return conditions.join(', ') || 'Good conditions';
  }

  /**
   * Get a brief weather summary for greetings
   */
  static getWeatherSummary(weather: BaseWeather): string {
    const summaries = [];

    if (weather.strejnic) {
      const temp = weather.strejnic.temperature;
      const wind = weather.strejnic.windSpeed;
      const vis = Math.round(weather.strejnic.visibility / 1000);
      const source = weather.strejnic.icao === this.STREJNIC_BACKUP ? ' (Bucharest area)' : '';
      
      summaries.push(`Strejnic${source}: ${temp}°C, ${wind}kt wind, ${vis}km visibility`);
    }

    if (weather.dezmir) {
      const temp = weather.dezmir.temperature;
      const wind = weather.dezmir.windSpeed;
      const vis = Math.round(weather.dezmir.visibility / 1000);
      const source = weather.dezmir.icao === this.DEZMIR_BACKUP ? ' (Cluj area)' : '';
      
      summaries.push(`Dezmir${source}: ${temp}°C, ${wind}kt wind, ${vis}km visibility`);
    }

    if (summaries.length === 0) {
      return 'Weather data unavailable';
    }

    return summaries.join(' | ');
  }

  /**
   * Check if weather conditions are suitable for flying
   */
  static isWeatherSuitable(weather: WeatherData): boolean {
    // Basic VFR conditions check
    const visibilityOk = weather.visibility >= 5000; // 5km minimum
    const ceilingOk = weather.ceiling >= 1500; // 1500ft minimum
    const windOk = weather.windSpeed <= 25; // 25kt maximum wind

    return visibilityOk && ceilingOk && windOk;
  }

  /**
   * Get weather status for both bases
   */
  static getWeatherStatus(weather: BaseWeather): {
    strejnicSuitable: boolean;
    dezmirSuitable: boolean;
    summary: string;
  } {
    const strejnicSuitable = weather.strejnic ? this.isWeatherSuitable(weather.strejnic) : false;
    const dezmirSuitable = weather.dezmir ? this.isWeatherSuitable(weather.dezmir) : false;

    let summary = '';
    if (strejnicSuitable && dezmirSuitable) {
      summary = 'Good flying conditions at both bases';
    } else if (strejnicSuitable || dezmirSuitable) {
      const suitableBase = strejnicSuitable ? 'Strejnic' : 'Dezmir';
      summary = `Good conditions at ${suitableBase}`;
    } else {
      summary = 'Marginal flying conditions';
    }

    // Add note if using backup weather data
    if (weather.strejnic?.icao === this.STREJNIC_BACKUP || weather.dezmir?.icao === this.DEZMIR_BACKUP) {
      const backupSources = [];
      if (weather.strejnic?.icao === this.STREJNIC_BACKUP) backupSources.push('Bucharest area');
      if (weather.dezmir?.icao === this.DEZMIR_BACKUP) backupSources.push('Cluj area');
      summary += ` (${backupSources.join(', ')} data)`;
    }

    return {
      strejnicSuitable,
      dezmirSuitable,
      summary
    };
  }
}
