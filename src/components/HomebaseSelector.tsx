'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plane, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Airfield {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface HomebaseSelectorProps {
  currentHomebaseId?: string | null;
  onHomebaseChange?: (homebaseId: string | null) => void;
  showCurrentHomebase?: boolean;
  title?: string;
  description?: string;
}

export function HomebaseSelector({
  currentHomebaseId,
  onHomebaseChange,
  showCurrentHomebase = true,
  title = "Select Your Homebase",
  description = "Choose your primary base for statistical purposes and personalized experience."
}: HomebaseSelectorProps) {
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedHomebaseId, setSelectedHomebaseId] = useState<string | null>(currentHomebaseId || null);

  useEffect(() => {
    fetchAirfields();
  }, []);

  useEffect(() => {
    setSelectedHomebaseId(currentHomebaseId || null);
  }, [currentHomebaseId]);

  const fetchAirfields = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bases');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bases');
      }

      setAirfields(data.bases || []);
    } catch (error) {
      console.error('Error fetching bases:', error);
      toast.error('Failed to load bases');
    } finally {
      setLoading(false);
    }
  };

  const handleHomebaseSelect = async (airfieldId: string | null) => {
    if (airfieldId === selectedHomebaseId) {
      return; // Already selected
    }

    setSaving(true);
    try {
      const response = await fetch('/api/my-account/homebase', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ homebaseId: airfieldId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update homebase');
      }

      setSelectedHomebaseId(airfieldId);
      onHomebaseChange?.(airfieldId);
      toast.success('Homebase updated successfully');
    } catch (error) {
      console.error('Error updating homebase:', error);
      toast.error('Failed to update homebase');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentHomebase = () => {
    if (!selectedHomebaseId) return null;
    return airfields.find(airfield => airfield.id === selectedHomebaseId) || null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading airfields...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showCurrentHomebase && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">Current Homebase</h4>
            {getCurrentHomebase() ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Plane className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{getCurrentHomebase()?.code}</div>
                  <div className="text-sm text-muted-foreground">
                    {getCurrentHomebase()?.name} • {getCurrentHomebase()?.city}, {getCurrentHomebase()?.country}
                  </div>
                </div>
                <Check className="h-4 w-4 text-green-500 ml-auto" />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">No homebase selected</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Available Airfields</h4>
          <div className="grid gap-3">
            {airfields.map((airfield) => {
              const isSelected = selectedHomebaseId === airfield.id;
              const isCurrent = currentHomebaseId === airfield.id;
              
              return (
                <div
                  key={airfield.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:shadow-sm'
                  }`}
                  onClick={() => handleHomebaseSelect(airfield.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <Plane className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium">{airfield.code}</h5>
                          <Badge variant="outline" className="text-xs">
                            {airfield.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {airfield.city}, {airfield.country}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        disabled={saving}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHomebaseSelect(airfield.id);
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedHomebaseId && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleHomebaseSelect(null)}
              disabled={saving}
              className="w-full"
            >
              Clear Homebase Selection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
