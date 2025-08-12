import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { WeatherService } from '@/lib/weather-service';

// Helper functions for context
function getSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}



function getFriendlyFallbackMessage(firstName: string, lastName: string, role: string, timeOfDay: string, isWeekend: boolean, season: string, weatherContext?: any) {
  const timeContext = timeOfDay === 'morning' ? 'morning' : timeOfDay === 'afternoon' ? 'afternoon' : 'evening';
  
  // Weather-related messages when available
  if (weatherContext && weatherContext.summary) {
    const weatherMessages = [
      `Perfect flying conditions at both bases today!`,
      `Excellent weather for flying - clear skies and light winds!`,
      `Great flying weather with ${weatherContext.summary.split('|')[0]?.split(':')[1]?.trim() || 'ideal conditions'}!`,
      `Beautiful flying conditions at Strejnic and Dezmir!`,
      `Clear skies and good visibility for your flights!`
    ];
    return weatherMessages[Math.floor(Math.random() * weatherMessages.length)];
  }
  
  const roleMessages = {
    PILOT: [
      `Good ${timeContext}, Captain ${lastName}!`,
      `Welcome back, Captain ${lastName}!`,
      `Hello Captain ${lastName}!`
    ],
    STUDENT: [
      `Good ${timeContext}, soon to be Captain ${lastName}!`,
      `Welcome back, soon to be Captain ${lastName}!`,
      `Hello soon to be Captain ${lastName}!`
    ],
    INSTRUCTOR: [
      `Good ${timeContext}, Captain ${lastName}!`,
      `Welcome back, Captain ${lastName}!`,
      `Hello Captain ${lastName}!`
    ],
    PROSPECT: [
      `Good ${timeContext}, ${firstName}!`,
      `Welcome, ${firstName}!`,
      `Hello ${firstName}!`
    ]
  };

  const messages = roleMessages[role as keyof typeof roleMessages] || roleMessages.PROSPECT;
  return messages[Math.floor(Math.random() * messages.length)];
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, role, timeOfDay } = body;

    // Get additional context for more personalized messages
    const currentHour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());
    const season = getSeason();
    
    // Get weather data for both bases
    let weatherContext = null;
    try {
      console.log('🌤️ Fetching weather data for bases...');
      const baseWeather = await WeatherService.getBaseWeather();
      console.log('🌤️ Weather data received:', {
        strejnic: baseWeather.strejnic ? 'available' : 'unavailable',
        dezmir: baseWeather.dezmir ? 'available' : 'unavailable'
      });
      
      if (baseWeather.strejnic || baseWeather.dezmir) {
        weatherContext = {
          summary: WeatherService.getWeatherSummary(baseWeather),
          status: WeatherService.getWeatherStatus(baseWeather),
          hasData: true
        };
        console.log('🌤️ Weather context created:', weatherContext.summary);
      } else {
        console.log('🌤️ No weather data available for either base');
      }
    } catch (error) {
      console.log('Could not fetch weather data:', error);
    }
    
    // Get pilot-specific context if applicable
    let pilotContext = null;
    if (role === 'PILOT' || role === 'STUDENT' || role === 'INSTRUCTOR') {
      try {
        // Get real flight hours from usage API instead of pilot stats
        const usageResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          // Find the current user's data by email
          const userData = usageData.clients?.find((client: any) => client.client.email === decoded.email);
          
          if (userData) {
            // Ensure we're using the individual user's data, not totals
            const individualFlightHours = userData.totalUsedHours || 0;
            
            pilotContext = {
              easaCurrency: {
                last90Days: {
                  flights: userData.flightCountLast90Days || 0,
                  hours: 0, // Will be calculated from flight logs
                  required: { flights: 3, hours: 2 }
                }
              },
              totalFlightHours: individualFlightHours, // Individual user's logged flight hours
              recentFlights: userData.recentFlights?.length || 0
            };
            
            console.log(`✅ Found user data for ${decoded.email}: ${individualFlightHours} flight hours`);
            console.log(`User data details:`, {
              email: userData.client.email,
              totalUsedHours: userData.totalUsedHours,
              totalBoughtHours: userData.totalBoughtHours,
              flightCountLast90Days: userData.flightCountLast90Days
            });
          } else {
            console.log(`❌ User data not found for ${decoded.email} in usage API response`);
            console.log(`Available clients:`, usageData.clients?.map((c: any) => c.client.email) || []);
          }
        }
      } catch (error) {
        console.log('Could not fetch pilot context from usage API:', error);
        
        // Fallback to pilot stats API
        try {
          const pilotStatsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/pilot-stats`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (pilotStatsResponse.ok) {
            const pilotStats = await pilotStatsResponse.json();
            pilotContext = {
              easaCurrency: pilotStats.easaCurrency,
              totalFlightHours: pilotStats.user?.totalFlightHours || 0,
              recentFlights: pilotStats.flights?.recent?.length || 0
            };
          }
        } catch (fallbackError) {
          console.log('Could not fetch pilot context from fallback API:', fallbackError);
        }
      }
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      // Return a default greeting if OpenAI is not configured
          return NextResponse.json({
      greeting: {
        greeting: `Good ${timeOfDay}, ${firstName}!`,
        message: getFriendlyFallbackMessage(firstName, lastName, role, timeOfDay, isWeekend, season, weatherContext),
        icon: timeOfDay === 'morning' ? 'sun' : timeOfDay === 'evening' ? 'moon' : 'plane',
        mood: timeOfDay === 'morning' ? 'energetic' : timeOfDay === 'evening' ? 'reflective' : 'friendly'
      }
    });
    }

    // Create role-specific prompts for OpenAI
    const rolePrompts = {
      PILOT: `You are a professional aviation colleague greeting Captain ${lastName}. Prioritize weather conditions and flying opportunities when available. Create a very short, factual greeting. Use "Captain ${lastName}". Keep it brief and professional.`,
      STUDENT: `You are a flight instructor greeting a student pilot. Prioritize weather conditions and flying opportunities when available. Create a very short greeting about their training status. Use "soon to be Captain ${lastName}". Keep it brief and professional.`,
      INSTRUCTOR: `You are a colleague greeting a flight instructor. Prioritize weather conditions and flying opportunities when available. Create a very short professional greeting. Use "Captain ${lastName}". Keep it brief.`,
      PROSPECT: `You are an aviation professional greeting someone interested in becoming a pilot. Create a very short welcoming greeting. Keep it brief.`
    };

    const systemPrompt = rolePrompts[role as keyof typeof rolePrompts] || 
      `You are a friendly aviation assistant greeting a user. Create a warm, professional greeting.`;

    const userPrompt = `Create a natural, professional greeting for ${role === 'STUDENT' ? 'soon to be Captain' : 'Captain'} ${lastName}, a ${role.toLowerCase()}, at ${timeOfDay} time. 

Context:
- Time: ${timeOfDay} (${currentHour}:00)
- Day: ${isWeekend ? 'Weekend' : 'Weekday'}
- Season: ${season}
${pilotContext ? `
- EASA Currency (90 days): ${pilotContext.easaCurrency?.last90Days?.flights || 0}/${pilotContext.easaCurrency?.last90Days?.required?.flights || 0} flights, ${pilotContext.easaCurrency?.last90Days?.hours || 0}/${pilotContext.easaCurrency?.last90Days?.required?.hours || 0} hours
- Individual Flight Hours: ${pilotContext.totalFlightHours} (this is ${role === 'STUDENT' ? 'soon to be Captain' : 'Captain'} ${lastName}'s personal flight hours only)
- Recent Flights: ${pilotContext.recentFlights} flights in the last 90 days
` : ''}
${weatherContext ? `
- Weather: ${weatherContext.summary}
- Flying Conditions: ${weatherContext.status.summary}
` : ''}

Requirements:
- Use "${role === 'STUDENT' ? 'soon to be Captain' : 'Captain'} ${lastName}" in the greeting
- Keep messages very short and concise (max 2-3 sentences)
- PRIORITY: If weather data is available, focus on weather conditions and flying opportunities
- Weather context: ${weatherContext ? `Excellent flying conditions at both bases - ${weatherContext.summary}` : 'Weather data unavailable'}
- If no weather data, focus on one key fact: flight hours, EASA currency, or recent activity
- IMPORTANT: The flight hours shown (${pilotContext?.totalFlightHours || 0}) are ${role === 'STUDENT' ? 'soon to be Captain' : 'Captain'} ${lastName}'s individual flight hours only
- Use natural, professional tone
- End greetings with exclamation marks (!) not periods
- Avoid cheesy or motivational language
- Suggest an appropriate icon (sun, moon, plane, user, award, book, graduation, cloud, thermometer, wind)
- Suggest a mood (energetic, productive, reflective, motivated, focused, friendly)

Return the response in this exact JSON format:
{
  "greeting": "A short greeting using ${role === 'STUDENT' ? 'soon to be Captain' : 'Captain'} ${lastName}",
  "message": "One brief fact about their aviation status or weather conditions",
  "icon": "icon_name",
  "mood": "mood_name"
}`;

    console.log('🤖 AI Prompt includes weather context:', !!weatherContext);
    if (weatherContext) {
      console.log('🌤️ Weather context in prompt:', {
        summary: weatherContext.summary,
        status: weatherContext.status.summary
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    console.log('🤖 AI Response content:', content);

    // Try to parse the JSON response
    let greeting;
    try {
      greeting = JSON.parse(content);
      console.log('✅ Parsed greeting:', greeting);
    } catch (parseError) {
      console.log('❌ Failed to parse AI response:', parseError);
      // If parsing fails, create a fallback greeting
      greeting = {
        greeting: `Good ${timeOfDay}, ${role === 'STUDENT' ? 'soon to be Captain' : 'Captain'} ${lastName}!`,
        message: getFriendlyFallbackMessage(firstName, lastName, role, timeOfDay, isWeekend, season, weatherContext),
        icon: timeOfDay === 'morning' ? 'sun' : timeOfDay === 'evening' ? 'moon' : 'plane',
        mood: timeOfDay === 'morning' ? 'energetic' : timeOfDay === 'evening' ? 'reflective' : 'productive'
      };
    }

    return NextResponse.json({ greeting });

  } catch (error) {
    console.error('Error generating greeting:', error);
    
    // Return a fallback greeting
    const { firstName, lastName, role, timeOfDay } = await request.json();
    const currentHour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());
    const season = getSeason();
    
    return NextResponse.json({
      greeting: {
        greeting: `Good ${timeOfDay}, ${firstName}!`,
        message: getFriendlyFallbackMessage(firstName, lastName, role, timeOfDay, isWeekend, season),
        icon: timeOfDay === 'morning' ? 'sun' : timeOfDay === 'evening' ? 'moon' : 'plane',
        mood: timeOfDay === 'morning' ? 'energetic' : timeOfDay === 'evening' ? 'reflective' : 'friendly'
      }
    });
  }
}
