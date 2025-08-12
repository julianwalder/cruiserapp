'use client';

import { useState, useEffect } from 'react';
import { 
  Drawer, 
  DrawerClose, 
  DrawerContent, 
  DrawerDescription, 
  DrawerFooter, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger 
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Cloud, 
  X, 
  Thermometer, 
  Wind, 
  Eye, 
  MapPin, 
  RefreshCw,
  Sun,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog
} from 'lucide-react';

interface WeatherPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WeatherData {
  temperature?: number;
  windSpeed?: number;
  windDirection?: number;
  visibility?: number;
  conditions?: string;
  pressure?: number;
  humidity?: number;
  dewPoint?: number;
}

interface WeatherResponse {
  weather: {
    strejnic: WeatherData | null;
    dezmir: WeatherData | null;
  };
  summary?: string;
  status?: string;
  timestamp?: string;
}

export function WeatherPopup({ open, onOpenChange }: WeatherPopupProps) {
  const [weatherData, setWeatherData] = useState<WeatherResponse['weather'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/weather', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data: WeatherResponse = await response.json();
        setWeatherData(data.weather);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch weather data');
      }
    } catch (err) {
      setError('Network error while fetching weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchWeatherData();
    }
  }, [open]);

  const getWeatherIcon = (conditions?: string) => {
    if (!conditions) return <Cloud className="h-6 w-6" />;
    
    const lowerConditions = conditions.toLowerCase();
    if (lowerConditions.includes('rain')) return <CloudRain className="h-6 w-6" />;
    if (lowerConditions.includes('thunder') || lowerConditions.includes('lightning')) return <CloudLightning className="h-6 w-6" />;
    if (lowerConditions.includes('snow')) return <CloudSnow className="h-6 w-6" />;
    if (lowerConditions.includes('fog') || lowerConditions.includes('mist')) return <CloudFog className="h-6 w-6" />;
    if (lowerConditions.includes('clear') || lowerConditions.includes('sunny')) return <Sun className="h-6 w-6" />;
    return <Cloud className="h-6 w-6" />;
  };

  const getWindDirection = (degrees?: number) => {
    if (!degrees) return 'N/A';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getVisibilityDescription = (visibility?: number) => {
    if (!visibility) return 'N/A';
    if (visibility > 10000) return 'Excellent';
    if (visibility > 5000) return 'Good';
    if (visibility > 3000) return 'Moderate';
    return 'Poor';
  };

  const getFlyingConditions = (data: WeatherData) => {
    if (!data.temperature || !data.windSpeed || !data.visibility) return 'Unknown';
    
    const temp = data.temperature;
    const wind = data.windSpeed;
    const vis = data.visibility;
    
    if (temp < -10 || temp > 45) return 'Unsafe';
    if (wind > 25) return 'Marginal';
    if (vis < 3000) return 'Marginal';
    if (wind > 15 || vis < 5000) return 'Caution';
    return 'Good';
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Good': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Caution': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Marginal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Unsafe': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const WeatherCard = ({ title, data, icao }: { title: string; data: WeatherData | null; icao: string }) => {
    if (!data) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              {title} ({icao})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Cloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No weather data available</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const flyingCondition = getFlyingConditions(data);

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            {title} ({icao})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Flying Conditions */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Flying Conditions:</span>
            <Badge className={getConditionColor(flyingCondition)}>
              {flyingCondition}
            </Badge>
          </div>

          {/* Weather Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{data.temperature}°C</p>
                <p className="text-xs text-muted-foreground">Temperature</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{data.windSpeed} kt</p>
                <p className="text-xs text-muted-foreground">
                  {data.windDirection ? `${getWindDirection(data.windDirection)}` : 'Direction N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : 'N/A'}</p>
                <p className="text-xs text-muted-foreground">
                  {data.visibility ? getVisibilityDescription(data.visibility) : 'Visibility'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getWeatherIcon(data.conditions)}
              <div>
                <p className="text-sm font-medium">{data.conditions || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Conditions</p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {(data.pressure || data.humidity || data.dewPoint) && (
            <div className="pt-2 border-t">
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                {data.pressure && <div>Pressure: {data.pressure} hPa</div>}
                {data.humidity && <div>Humidity: {data.humidity}%</div>}
                {data.dewPoint && <div>Dew Point: {data.dewPoint}°C</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Conditions
          </DrawerTitle>
          <DrawerDescription>
            Current weather at our bases for VFR flying
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading weather data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Weather Unavailable</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchWeatherData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <WeatherCard 
                  title="Strejnic Base" 
                  data={weatherData?.strejnic || null} 
                  icao="LRPW"
                />
                <WeatherCard 
                  title="Dezmir Base" 
                  data={weatherData?.dezmir || null} 
                  icao="LRCJ"
                />
                
                {/* VFR Flying Guidelines */}
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sun className="h-5 w-5 text-blue-600" />
                      VFR Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Good
                      </Badge>
                      <span>Clear conditions, safe for VFR flight</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Caution
                      </Badge>
                      <span>Exercise caution, monitor conditions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        Marginal
                      </Badge>
                      <span>Limited visibility or strong winds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Unsafe
                      </Badge>
                      <span>Dangerous conditions, avoid flight</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
        
        <DrawerFooter className="border-t">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchWeatherData}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <DrawerClose asChild>
              <Button className="flex-1">Close</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
