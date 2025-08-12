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
  const displayName = firstName || lastName || 'there';
  
  // Weather-related messages when available
  if (weatherContext && weatherContext.summary) {
    const weatherMessages = [
      `perfect day VFR conditions today!`,
      `excellent weather for daytime flying!`,
      `beautiful day VFR conditions await!`,
      `clear skies and light winds for day flying!`,
      `ideal day VFR conditions for aviation!`
    ];
    return weatherMessages[Math.floor(Math.random() * weatherMessages.length)];
  }
  
  const roleMessages = {
    PILOT: [
      `ready for today's day VFR flights!`,
      `skies are calling for daytime flying!`,
      `another day of day VFR aviation excellence!`
    ],
    STUDENT: [
      `keep learning and building day VFR experience!`,
      `every daytime flight brings you closer to your wings!`,
      `your day VFR pilot journey continues!`
    ],
    INSTRUCTOR: [
      `shaping future pilots with day VFR training!`,
      `your day VFR guidance inspires!`,
      `leading the next generation of day VFR pilots!`
    ],
    PROSPECT: [
      `your day VFR aviation journey begins!`,
      `welcome to the world of daytime flight!`,
      `the daytime sky is your destination!`
    ]
  };

  const messages = roleMessages[role as keyof typeof roleMessages] || roleMessages.PROSPECT;
  return messages[Math.floor(Math.random() * messages.length)];
}

export async function POST(request: NextRequest) {
  let firstName: string = '', lastName: string = '', role: string = 'PILOT', timeOfDay: string = 'morning';
  
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
    
    console.log('🔍 Greeting API: Received body:', body);
    
    // Extract fields with proper destructuring
    firstName = body.firstName;
    lastName = body.lastName;
    role = body.role;
    timeOfDay = body.timeOfDay;
    
    console.log('🔍 Greeting API: Extracted fields:', { firstName, lastName, role, timeOfDay });

    // Validate required fields
    if (!firstName || !lastName || !role || !timeOfDay) {
      console.log('🔍 Greeting API: Validation failed - missing fields:', {
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        hasRole: !!role,
        hasTimeOfDay: !!timeOfDay
      });
      return NextResponse.json({ 
        error: 'Missing required fields: firstName, lastName, role, timeOfDay',
        received: { firstName, lastName, role, timeOfDay }
      }, { status: 400 });
    }

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
        message: getFriendlyFallbackMessage(firstName, lastName, role, timeOfDay, isWeekend, season),
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

    const systemPrompt = `You are a professional aviation colleague greeting ${role === 'STUDENT' ? 'soon to be Captain' : 'Captain'} ${lastName}. Create a short, natural greeting. Keep it brief and professional.`;

    const userPrompt = `Create a greeting for ${firstName} ${lastName}, a ${role.toLowerCase()}, at ${timeOfDay} time.

Context:
- Time: ${timeOfDay}
- Flight Hours: ${pilotContext?.totalFlightHours || 0} (personal hours)
- Recent Flights: ${pilotContext?.recentFlights || 0} flights
- Weather: ${weatherContext ? weatherContext.summary : 'Weather data unavailable'}

Requirements:
- Greeting MUST start with "Captain ${lastName}"
- Generate a short greeting (1-2 sentences max)
- Focus on weather conditions if available
- Use natural, conversational tone
- End with exclamation mark (!)
- Avoid generic phrases like "Ready to soar through the skies!"
- IMPORTANT: Only mention day VFR flying - no night flying

MESSAGE REQUIREMENTS (subtitle):
- Transform weather and flight data into natural conversation
- Example: "Beautiful 24°C in Strejnic with light winds. You've logged 26.8 hours with 9 flights this quarter."
- Make it sound like natural speech

Return JSON:
{
  "greeting": "Captain ${lastName}, [short natural greeting]",
  "message": "Natural conversation about weather and flight data"
}`;

    console.log('🤖 Using gpt-4o-mini model with simplified prompt');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
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
        message: getFriendlyFallbackMessage(firstName, lastName, role, timeOfDay, isWeekend, season),
        icon: timeOfDay === 'morning' ? 'sun' : timeOfDay === 'evening' ? 'moon' : 'plane',
        mood: timeOfDay === 'morning' ? 'energetic' : timeOfDay === 'evening' ? 'reflective' : 'friendly'
      };
    }

    return NextResponse.json({ greeting });

  } catch (error) {
    console.error('Error generating greeting:', error);
    
    // Return a fallback greeting without trying to read request body again
    const currentHour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());
    const season = getSeason();
    
            return NextResponse.json({
          greeting: {
            greeting: `Good ${timeOfDay || 'day'}, ${firstName || 'there'}!`,
            message: getFriendlyFallbackMessage(firstName || '', lastName || '', role || 'PILOT', timeOfDay || 'morning', isWeekend, season)
          }
        });
  }
}
