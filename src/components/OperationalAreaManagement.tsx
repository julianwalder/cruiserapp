'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  Download, 
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Continent {
  code: string;
  name: string;
}

interface Country {
  code: string;
  name: string;
  continent: string;
}

interface OperationalArea {
  id: string;
  continent: string;
  countries: string[];
  createdAt: string;
  updatedAt: string;
}

interface ImportedAirfield {
  id: string;
  name: string;
  code: string;
  type: string;
  latitude: string;
  longitude: string;
  elevation: string;
  continent: string;
  country: string;
  region: string;
  municipality: string;
  scheduled_service: string;
  gps_code: string;
  iata_code: string;
  local_code: string;
  home_link: string;
  wikipedia_link: string;
  keywords: string;
  isBase: boolean;
}

const CONTINENTS: Continent[] = [
  { code: 'AF', name: 'Africa' },
  { code: 'AN', name: 'Antarctica' },
  { code: 'AS', name: 'Asia' },
  { code: 'EU', name: 'Europe' },
  { code: 'NA', name: 'North America' },
  { code: 'OC', name: 'Oceania' },
  { code: 'SA', name: 'South America' },
];

const COUNTRIES: Country[] = [
  // Europe
  { code: 'RO', name: 'Romania', continent: 'EU' },
  { code: 'BG', name: 'Bulgaria', continent: 'EU' },
  { code: 'HU', name: 'Hungary', continent: 'EU' },
  { code: 'RS', name: 'Serbia', continent: 'EU' },
  { code: 'UA', name: 'Ukraine', continent: 'EU' },
  { code: 'MD', name: 'Moldova', continent: 'EU' },
  { code: 'DE', name: 'Germany', continent: 'EU' },
  { code: 'FR', name: 'France', continent: 'EU' },
  { code: 'IT', name: 'Italy', continent: 'EU' },
  { code: 'ES', name: 'Spain', continent: 'EU' },
  { code: 'GB', name: 'United Kingdom', continent: 'EU' },
  { code: 'PL', name: 'Poland', continent: 'EU' },
  { code: 'CZ', name: 'Czech Republic', continent: 'EU' },
  { code: 'SK', name: 'Slovakia', continent: 'EU' },
  { code: 'AT', name: 'Austria', continent: 'EU' },
  { code: 'CH', name: 'Switzerland', continent: 'EU' },
  { code: 'NL', name: 'Netherlands', continent: 'EU' },
  { code: 'BE', name: 'Belgium', continent: 'EU' },
  { code: 'DK', name: 'Denmark', continent: 'EU' },
  { code: 'SE', name: 'Sweden', continent: 'EU' },
  { code: 'NO', name: 'Norway', continent: 'EU' },
  { code: 'FI', name: 'Finland', continent: 'EU' },
  { code: 'EE', name: 'Estonia', continent: 'EU' },
  { code: 'LV', name: 'Latvia', continent: 'EU' },
  { code: 'LT', name: 'Lithuania', continent: 'EU' },
  { code: 'IE', name: 'Ireland', continent: 'EU' },
  { code: 'PT', name: 'Portugal', continent: 'EU' },
  { code: 'GR', name: 'Greece', continent: 'EU' },
  { code: 'HR', name: 'Croatia', continent: 'EU' },
  { code: 'SI', name: 'Slovenia', continent: 'EU' },
  { code: 'ME', name: 'Montenegro', continent: 'EU' },
  { code: 'AL', name: 'Albania', continent: 'EU' },
  { code: 'MK', name: 'North Macedonia', continent: 'EU' },
  { code: 'BA', name: 'Bosnia and Herzegovina', continent: 'EU' },
  { code: 'XK', name: 'Kosovo', continent: 'EU' },
  { code: 'TR', name: 'Turkey', continent: 'EU' },
  { code: 'CY', name: 'Cyprus', continent: 'EU' },
  { code: 'MT', name: 'Malta', continent: 'EU' },
  { code: 'IS', name: 'Iceland', continent: 'EU' },
  { code: 'LU', name: 'Luxembourg', continent: 'EU' },
  { code: 'LI', name: 'Liechtenstein', continent: 'EU' },
  { code: 'MC', name: 'Monaco', continent: 'EU' },
  { code: 'SM', name: 'San Marino', continent: 'EU' },
  { code: 'VA', name: 'Vatican City', continent: 'EU' },
  { code: 'AD', name: 'Andorra', continent: 'EU' },
  // North America
  { code: 'US', name: 'United States', continent: 'NA' },
  { code: 'CA', name: 'Canada', continent: 'NA' },
  { code: 'MX', name: 'Mexico', continent: 'NA' },
  // Add more countries as needed
];

export default function OperationalAreaManagement() {
  const [operationalAreas, setOperationalAreas] = useState<OperationalArea[]>([]);
  const [selectedContinent, setSelectedContinent] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [importedAirfields, setImportedAirfields] = useState<ImportedAirfield[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [baseAirfieldsCount, setBaseAirfieldsCount] = useState(0);
  const [selectedAreaForImport, setSelectedAreaForImport] = useState<OperationalArea | null>(null);
  const [selectedAirfieldTypes, setSelectedAirfieldTypes] = useState<string[]>([
    'large_airport',
    'medium_airport', 
    'small_airport'
  ]);

  const availableAirfieldTypes = [
    { value: 'large_airport', label: 'Large Airport', dbType: 'large_airport' },
    { value: 'medium_airport', label: 'Medium Airport', dbType: 'medium_airport' },
    { value: 'small_airport', label: 'Small Airport', dbType: 'small_airport' },
    { value: 'heliport', label: 'Heliport', dbType: 'heliport' },
    { value: 'seaplane_base', label: 'Seaplane Base', dbType: 'seaplane_base' },
    { value: 'balloonport', label: 'Balloon Port', dbType: 'balloonport' }
  ];

  // Get countries for selected continent
  const availableCountries = COUNTRIES.filter(country => 
    selectedContinent ? country.continent === selectedContinent : true
  );



  // Load existing operational areas, base airfields count, and imported airfields
  useEffect(() => {
    const fetchOperationalAreas = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/operational-areas', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setOperationalAreas(data);
        }
      } catch (error) {
        console.error('Failed to fetch operational areas:', error);
      }
    };

    const fetchBaseAirfieldsCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/operational-areas/base-count', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setBaseAirfieldsCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch base airfields count:', error);
      }
    };

    const fetchImportedAirfields = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/airfields?limit=1000', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Transform the airfields to match the ImportedAirfield interface
          const transformedAirfields = data.airfields.map((airfield: any) => ({
            id: airfield.id,
            name: airfield.name,
            code: airfield.code,
            type: airfield.type,
            latitude: airfield.latitude?.toString() || '',
            longitude: airfield.longitude?.toString() || '',
            elevation: airfield.elevation?.toString() || '',
            continent: '', // Not available in our database
            country: airfield.country,
            region: airfield.state || '',
            municipality: airfield.city || '',
            scheduled_service: '',
            gps_code: '',
            iata_code: '',
            local_code: '',
            home_link: airfield.website || '',
            wikipedia_link: '',
            keywords: '',
            isBase: airfield.isBase,
                      }));
          setImportedAirfields(transformedAirfields);
        }
      } catch (error) {
        console.error('Failed to fetch imported airfields:', error);
      }
    };

    fetchOperationalAreas();
    fetchBaseAirfieldsCount();
    fetchImportedAirfields();
  }, []);

  const handleAddOperationalArea = async () => {
    if (!selectedContinent || selectedCountries.length === 0) {
      toast.error('Please select a continent and at least one country');
      return;
    }

    // Check if operational area already exists
    const existingArea = operationalAreas.find(area => 
      area.continent === selectedContinent && 
      JSON.stringify(area.countries.sort()) === JSON.stringify(selectedCountries.sort())
    );

    if (existingArea) {
      toast.error('An operational area with this continent and countries combination already exists');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/operational-areas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          continent: selectedContinent,
          countries: selectedCountries,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create operational area');
      }

      const newArea = await response.json();
      setOperationalAreas([...operationalAreas, newArea]);
      setSelectedContinent('');
      setSelectedCountries([]);
      toast.success('Operational area created successfully');
      setShowCreateDialog(false);
      
      // Refresh base airfields count
      const countResponse = await fetch('/api/operational-areas/base-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setBaseAirfieldsCount(countData.count);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOperationalArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this operational area? This will also delete all associated base airfields.')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/operational-areas?id=${areaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete operational area');
      }

      setOperationalAreas(prev => prev.filter(area => area.id !== areaId));
      toast.success('Operational area deleted successfully');
      
      // Refresh base airfields count
      const countResponse = await fetch('/api/operational-areas/base-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setBaseAirfieldsCount(countData.count);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportAirfields = async (operationalArea?: OperationalArea) => {
    const areaToImport = operationalArea || selectedAreaForImport;
    
    if (!areaToImport) {
      toast.error('No operational area selected for import');
      return;
    }

    if (selectedAirfieldTypes.length === 0) {
      toast.error('Please select at least one airfield type to import');
      return;
    }

    try {
      setImporting(true);
      setProgress(0);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/operational-areas/import-airfields', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countries: areaToImport.countries,
          types: selectedAirfieldTypes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import airfields');
      }

      const data = await response.json();
      
      // Merge new airfields with existing ones, avoiding duplicates
      setImportedAirfields(prevAirfields => {
        const existingAirfieldIds = new Set(prevAirfields.map(af => af.id));
        const newAirfields = data.airfields.filter((af: any) => !existingAirfieldIds.has(af.id));
        return [...prevAirfields, ...newAirfields];
      });
      
      toast.success(`Successfully imported ${data.airfields.length} airfields for ${CONTINENTS.find(c => c.code === areaToImport.continent)?.name}`);
      setShowImportDialog(false);
      setSelectedAreaForImport(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };





  // Group operational areas by continent
  const groupedOperationalAreas = operationalAreas.reduce((groups, area) => {
    const continentCode = area.continent;
    const continentName = CONTINENTS.find(c => c.code === continentCode)?.name || continentCode;
    
    if (!groups[continentCode]) {
      groups[continentCode] = {
        continentCode,
        continentName,
        areas: [],
        totalCountries: 0,
        uniqueCountries: new Set()
      };
    }
    
    groups[continentCode].areas.push(area);
    area.countries.forEach(country => groups[continentCode].uniqueCountries.add(country));
    groups[continentCode].totalCountries = groups[continentCode].uniqueCountries.size;
    
    return groups;
  }, {} as Record<string, {
    continentCode: string;
    continentName: string;
    areas: OperationalArea[];
    totalCountries: number;
    uniqueCountries: Set<string>;
  }>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Operational Area Management</CardTitle>
              <CardDescription>
                Define operational areas and import airfields from OurAirports database
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Area
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Alerts */}
          {/* Operational Areas Table */}
          <div className="border border-border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Continent</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Airfields</TableHead>
                  <TableHead>Base Airfields</TableHead>
                  <TableHead>Types Imported</TableHead>
                  <TableHead>Types Excluded</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading operational areas...
                    </TableCell>
                  </TableRow>
                ) : operationalAreas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="space-y-2">
                        <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
                        <div className="text-lg font-medium">No Operational Areas</div>
                        <div className="text-sm text-muted-foreground">
                          Create your first operational area to define where your flight school operates.
                        </div>
                        <Button onClick={() => setShowCreateDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Area
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.values(groupedOperationalAreas).map((group) => (
                    group.areas.map((area) => {
                      // Calculate airfields for this area
                      const areaAirfields = importedAirfields.filter(airfield => 
                        area.countries.includes(airfield.country)
                      );
                      const baseAirfields = areaAirfields.filter(airfield => airfield.isBase);
                      
                      return (
                        <TableRow key={area.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {group.continentCode}
                              </Badge>
                              <span className="text-sm font-medium">{group.continentName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {area.countries.map((countryCode) => {
                                const country = COUNTRIES.find(c => c.code === countryCode);
                                return (
                                  <span key={countryCode} className="text-sm">
                                    {country?.name}
                                  </span>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-lg font-bold text-primary">{areaAirfields.length}</div>
                              <div className="text-xs text-muted-foreground">total</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-lg font-bold text-success">{baseAirfields.length}</div>
                              <div className="text-xs text-muted-foreground">designated</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {(() => {
                                const importedDbTypes = new Set(areaAirfields.map(af => af.type));
                                
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {availableAirfieldTypes
                                      .filter(type => importedDbTypes.has(type.dbType))
                                      .map(type => (
                                        <Badge key={type.value} variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                                          {type.label}
                                        </Badge>
                                      ))}
                                    {availableAirfieldTypes.filter(type => importedDbTypes.has(type.dbType)).length === 0 && (
                                      <span className="text-xs text-muted-foreground">None</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {(() => {
                                const importedDbTypes = new Set(areaAirfields.map(af => af.type));
                                const allDbTypes = availableAirfieldTypes.map(t => t.dbType);
                                const excludedDbTypes = allDbTypes.filter(t => !importedDbTypes.has(t));
                                
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {availableAirfieldTypes
                                      .filter(type => excludedDbTypes.includes(type.dbType))
                                      .map(type => (
                                        <Badge key={type.value} variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted">
                                          {type.label}
                                        </Badge>
                                      ))}
                                    {excludedDbTypes.length === 0 && (
                                      <span className="text-xs text-muted-foreground">None</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(area.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(area.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAreaForImport(area);
                                  setShowImportDialog(true);
                                }}
                                disabled={importing}
                                className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                title="Import Airfields"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOperationalArea(area.id)}
                                disabled={loading}
                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                title="Delete Area"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ))
                )}
              </TableBody>
            </Table>
          </div>



        </CardContent>
      </Card>

      {/* Create Operational Area Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Operational Area</DialogTitle>
            <DialogDescription>
              Select continents and countries that define your operational area
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="continent">Continent</Label>
                <Combobox
                  options={CONTINENTS.map(continent => ({
                    value: continent.code,
                    label: continent.name
                  }))}
                  value={selectedContinent}
                  onValueChange={setSelectedContinent}
                  placeholder="Select a continent"
                  searchPlaceholder="Search continents..."
                  emptyText="No continent found."
                />
              </div>

              <div>
                <Label htmlFor="countries">Countries</Label>
                <Combobox
                  options={availableCountries.map(country => ({
                    value: country.code,
                    label: country.name
                  }))}
                  value=""
                  onValueChange={(value) => {
                    if (!selectedCountries.includes(value)) {
                      setSelectedCountries([...selectedCountries, value]);
                    }
                  }}
                  placeholder="Select countries"
                  searchPlaceholder="Search countries..."
                  emptyText="No country found."
                  disabled={!selectedContinent}
                />
              </div>
            </div>

            {/* Selected Countries */}
            {selectedCountries.length > 0 && (
              <div>
                <Label>Selected Countries:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCountries.map((countryCode) => {
                    const country = COUNTRIES.find(c => c.code === countryCode);
                    return (
                      <Badge key={countryCode} variant="secondary" className="flex items-center space-x-1">
                        <span>{country?.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => setSelectedCountries(selectedCountries.filter(c => c !== countryCode))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddOperationalArea} 
              disabled={loading || !selectedContinent || selectedCountries.length === 0}
            >
              Create Area
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Airfields</DialogTitle>
            <DialogDescription>
              {selectedAreaForImport ? (
                <>
                  This will import airfields from OurAirports database for the selected operational area:
                  <br />
                  <strong>{CONTINENTS.find(c => c.code === selectedAreaForImport.continent)?.name}</strong> - {
                    selectedAreaForImport.countries.map(countryCode => {
                      const country = COUNTRIES.find(c => c.code === countryCode);
                      return country?.name;
                    }).join(', ')
                  }
                  <br />
                  Select the types of airfields you want to import:
                </>
              ) : (
                'This will import airfields from OurAirports database for your operational areas. This process may take a few minutes.'
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* Airfield Type Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Airfield Types to Import</Label>
              <div className="grid grid-cols-2 gap-6 mt-2">
                {/* First Column - Main Airport Types */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Main Airports</h4>
                  {availableAirfieldTypes
                    .filter(type => ['large_airport', 'medium_airport', 'small_airport'].includes(type.value))
                    .map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.value}
                          checked={selectedAirfieldTypes.includes(type.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAirfieldTypes([...selectedAirfieldTypes, type.value]);
                            } else {
                              setSelectedAirfieldTypes(selectedAirfieldTypes.filter(t => t !== type.value));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={type.value} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                </div>
                
                {/* Second Column - Specialized Types */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Specialized</h4>
                  {availableAirfieldTypes
                    .filter(type => ['heliport', 'seaplane_base', 'balloonport'].includes(type.value))
                    .map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.value}
                          checked={selectedAirfieldTypes.includes(type.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAirfieldTypes([...selectedAirfieldTypes, type.value]);
                            } else {
                              setSelectedAirfieldTypes(selectedAirfieldTypes.filter(t => t !== type.value));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={type.value} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
          
          {importing && (
            <div className="space-y-4">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">
                Importing airfields... {progress}%
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportDialog(false);
                setSelectedAreaForImport(null);
              }}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleImportAirfields()}
              disabled={importing || selectedAirfieldTypes.length === 0}
            >
              {importing ? 'Importing...' : 'Start Import'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 