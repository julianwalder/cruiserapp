'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from './ui/Modal';
import { ReferenceAirport } from '@/types/our-airports-types';

// Helper function to get badge styling for airport types
function getAirportTypeBadgeStyle(type: string): string {
  const typeLower = type.toLowerCase();

  // Specific type mappings for consistent styling
  const typeStyles: { [key: string]: string } = {
    'small_airport': 'bg-green-500/10 text-green-700 border-green-200/20',
    'medium_airport': 'bg-yellow-500/10 text-yellow-700 border-yellow-200/20',
    'large_airport': 'bg-red-500/10 text-red-700 border-red-200/20',
    'heliport': 'bg-blue-500/10 text-blue-700 border-blue-200/20',
    'seaplane_base': 'bg-cyan-500/10 text-cyan-700 border-cyan-200/20',
    'balloonport': 'bg-purple-500/10 text-purple-700 border-purple-200/20',
    'gliderport': 'bg-indigo-500/10 text-indigo-700 border-indigo-200/20',
    'ultralight_field': 'bg-orange-500/10 text-orange-700 border-orange-200/20',
    'airstrip': 'bg-gray-500/10 text-gray-700 border-gray-200/20'
  };

  // Check for exact matches first
  if (typeStyles[typeLower]) {
    return typeStyles[typeLower];
  }

  // Fallback to pattern matching
  if (typeLower.includes('heliport')) {
    return 'bg-blue-500/10 text-blue-700 border-blue-200/20';
  }
  if (typeLower.includes('seaplane')) {
    return 'bg-cyan-500/10 text-cyan-700 border-cyan-200/20';
  }
  if (typeLower.includes('balloon')) {
    return 'bg-purple-500/10 text-purple-700 border-purple-200/20';
  }
  if (typeLower.includes('glider')) {
    return 'bg-indigo-500/10 text-indigo-700 border-indigo-200/20';
  }
  if (typeLower.includes('ultralight')) {
    return 'bg-orange-500/10 text-orange-700 border-orange-200/20';
  }
  if (typeLower.includes('closed') || typeLower.includes('strip')) {
    return 'bg-gray-500/10 text-gray-700 border-gray-200/20';
  }
  if (typeLower.includes('small')) {
    return 'bg-green-500/10 text-green-700 border-green-200/20';
  }
  if (typeLower.includes('medium')) {
    return 'bg-yellow-500/10 text-yellow-700 border-yellow-200/20';
  }
  if (typeLower.includes('large')) {
    return 'bg-red-500/10 text-red-700 border-red-200/20';
  }

  // Default for regular airports
  return 'bg-primary/10 text-primary border-primary/20';
}

// Helper function to format airport type for display
function formatAirportType(type: string): string {
  const typeLower = type.toLowerCase();

  // Handle specific type mappings
  const typeMappings: { [key: string]: string } = {
    'small_airport': 'Small Airport',
    'medium_airport': 'Medium Airport',
    'large_airport': 'Large Airport',
    'heliport': 'Heliport',
    'seaplane_base': 'Seaplane Base',
    'balloonport': 'Balloon Port',
    'gliderport': 'Glider Port',
    'ultralight_field': 'Ultralight Field',
    'airport': 'Airport',
    'airstrip': 'Airstrip'
  };

  // Return mapped type if available, otherwise convert snake_case to Title Case
  return typeMappings[typeLower] || typeLower
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface AddAirfieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAirfieldAdded: () => void;
}

export default function AddAirfieldModal({ isOpen, onClose, onAirfieldAdded }: AddAirfieldModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReferenceAirport[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  
  console.log('AddAirfieldModal render:', { isOpen, onClose: !!onClose, onAirfieldAdded: !!onAirfieldAdded, searchResultsLength: searchResults.length });
  
  // Monitor searchResults changes
  useEffect(() => {
    console.log('searchResults changed:', searchResults);
  }, [searchResults]);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (query.trim().length >= 2) {
            searchReferenceAirports(query);
          } else {
            setSearchResults([]);
          }
        }, 300); // 300ms delay
      };
    })(),
    []
  );
  
  // Search reference airports
  const searchReferenceAirports = async (query: string) => {
    if (!query.trim() || query.length < 2) return;
    
    setSearching(true);
    try {
      const response = await fetch('/api/airfields/search-reference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ searchQuery: query })
      });

      if (!response.ok) {
        throw new Error('Failed to search reference airports');
      }

      const data = await response.json();
      console.log('Search response:', data);
      console.log('Setting search results:', data.airports || []);
      setSearchResults(data.airports || []);
    } catch (error) {
      console.error('Error searching reference airports:', error);
      alert('Failed to search reference airports');
    } finally {
      setSearching(false);
    }
  };

  // Import single airport
  const importAirport = async (airport: ReferenceAirport) => {
    setImporting(true);
    try {
      const response = await fetch('/api/airfields/import-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ airportId: airport.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error cases with better messages
        if (response.status === 409 && errorData.details) {
          // Show detailed conflict information
          const message = `${errorData.error}\n\n${errorData.details.message}`;
          alert(message);
        } else {
          throw new Error(errorData.error || 'Failed to import airport');
        }
        return; // Don't proceed with success flow
      }

      const data = await response.json();
      console.log('Successfully imported airport:', data);
      
      // Close modal and refresh airfields
      setSearchQuery('');
      setSearchResults([]);
      onClose();
      onAirfieldAdded();
      
      // Show success message
      alert(`Successfully imported ${airport.name}`);
    } catch (error) {
      console.error('Error importing airport:', error);
      alert(error instanceof Error ? error.message : 'Failed to import airport');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Search Reference Airports"
    >
      <div className="h-[600px] flex flex-col">
        {/* Search Input - Fixed at top */}
        <div className="space-y-2 flex-shrink-0">
          <Label htmlFor="search">Search by name, ICAO code, or city</Label>
          <Input
            id="search"
            placeholder="Start typing to search... (e.g., Paris, LFPG, CDG)"
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              debouncedSearch(value);
            }}
            className="w-[calc(100%-4px)] mx-auto"
          />
          {searching && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Searching...
            </div>
          )}
        </div>

        {/* Content Area - Fixed height with scroll */}
        <div className="flex-1 overflow-y-auto mt-4">
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Search Results ({searchResults.length})</h3>
              <div className="space-y-2">
                {searchResults.map((airport) => (
                  <div
                    key={airport.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header with name and type */}
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg">{airport.name}</h4>
                          {airport.type && (
                            <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getAirportTypeBadgeStyle(airport.type)}`}>
                              {formatAirportType(airport.type)}
                            </span>
                          )}
                        </div>

                        {/* Codes section */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            {airport.icao_code && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">ICAO:</span>
                                <span className="font-mono bg-muted px-2 py-1 rounded">{airport.icao_code}</span>
                              </div>
                            )}
                            {airport.iata_code && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">IATA:</span>
                                <span className="font-mono bg-muted px-2 py-1 rounded">{airport.iata_code}</span>
                              </div>
                            )}
                            {airport.gps_code && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">GPS:</span>
                                <span className="font-mono bg-muted px-2 py-1 rounded">{airport.gps_code}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {airport.municipality && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">City:</span>
                                <span>{airport.municipality}</span>
                              </div>
                            )}
                            {airport.country_name && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">Country:</span>
                                <span>{airport.country_name}</span>
                              </div>
                            )}
                            {airport.region_name && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">Region:</span>
                                <span>{airport.region_name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Coordinates and elevation */}
                        {(airport.latitude_deg || airport.longitude_deg || airport.elevation_ft) && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {airport.latitude_deg && airport.longitude_deg && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">Coordinates:</span>
                                <span className="font-mono text-xs">
                                  {airport.latitude_deg.toFixed(6)}, {airport.longitude_deg.toFixed(6)}
                                </span>
                              </div>
                            )}
                            {airport.elevation_ft && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">Elevation:</span>
                                <span>{airport.elevation_ft.toLocaleString()} ft</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => importAirport(airport)}
                          disabled={importing}
                          className="whitespace-nowrap"
                        >
                          {importing ? 'Importing...' : 'Import'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery && !searching && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No airports found matching "{searchQuery}"</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          )}

          {/* Search Instructions */}
          {!searchQuery && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Start typing to search for airports</p>
              <p className="text-sm mt-2">Examples: "Paris", "LFPG", "CDG"</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
