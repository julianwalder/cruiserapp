'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plane, MapPin, User, Edit, Trash2, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateWithCurrentFormat } from '@/lib/date-utils';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userRoles: Array<{ role: { name: string } }>;
}

interface Airfield {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string;
  country: string;
  isBase: boolean;
}

interface BaseManagement {
  id: string;
  airfieldId: string;
  baseManagerId: string | null;
  additionalInfo: string | null;
  facilities: string[];
  operatingHours: string | null;
  emergencyContact: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  airfield: Airfield;
  baseManager: User | null;
}

interface BaseManagementProps {
  canEdit?: boolean;
}

export default function BaseManagement({ canEdit = true }: BaseManagementProps) {
  const [baseManagements, setBaseManagements] = useState<BaseManagement[]>([]);
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [baseManagers, setBaseManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedBase, setSelectedBase] = useState<BaseManagement | null>(null);
  const [formData, setFormData] = useState<{
    airfieldId: string;
    baseManagerId: string | undefined;
    additionalInfo: string;
    facilities: string[];
    operatingHours: string;
    emergencyContact: string;
    notes: string;
  }>({
    airfieldId: '',
    baseManagerId: undefined,
    additionalInfo: '',
    facilities: [],
    operatingHours: '',
    emergencyContact: '',
    notes: ''
  });


  useEffect(() => {
    fetchBaseManagements();
    fetchAirfields();
    fetchBaseManagers();
  }, []);

  const fetchBaseManagements = async () => {
    try {
      const response = await fetch('/api/base-management', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBaseManagements(data);
      } else if (response.status === 403) {
        // User doesn't have permission to access base management
        setBaseManagements([]);
        console.log('User does not have permission to access base management');
      } else {
        toast.error('Failed to fetch bases');
      }
    } catch (error) {
      console.error('Error fetching base managements:', error);
      toast.error('Failed to fetch bases');
    } finally {
      setLoading(false);
    }
  };

  const fetchAirfields = async () => {
    try {
      const response = await fetch('/api/airfields?limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAirfields(data.airfields || data);
      }
    } catch (error) {
      console.error('Error fetching airfields:', error);
    }
  };

  const fetchBaseManagers = async () => {
    try {
      const response = await fetch('/api/users?role=BASE_MANAGER', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBaseManagers(data.users || data);
      }
    } catch (error) {
      console.error('Error fetching base managers:', error);
    }
  };

  const handleCreateBase = async () => {
    try {
      // Prepare data for API - convert empty strings to null for optional fields
      const apiData = {
        ...formData,
        baseManagerId: formData.baseManagerId || null,
        additionalInfo: formData.additionalInfo || null,
        operatingHours: formData.operatingHours || null,
        emergencyContact: formData.emergencyContact || null,
        notes: formData.notes || null,
      };

      const response = await fetch('/api/base-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(apiData)
      });

      if (response.ok) {
        toast.success('Base created successfully');
        setShowCreateDialog(false);
        resetForm();
        fetchBaseManagements();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create base');
      }
    } catch (error) {
      console.error('Error creating base:', error);
      toast.error('Error creating base');
    }
  };

  const handleUpdateBase = async () => {
    if (!selectedBase) return;

    try {
      // Prepare data for API - convert empty strings to null for optional fields
      const apiData = {
        ...formData,
        baseManagerId: formData.baseManagerId || null,
        additionalInfo: formData.additionalInfo || null,
        operatingHours: formData.operatingHours || null,
        emergencyContact: formData.emergencyContact || null,
        notes: formData.notes || null,
      };

      const response = await fetch(`/api/base-management/${selectedBase.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(apiData)
      });

      if (response.ok) {
        toast.success('Base updated successfully');
        setShowEditDialog(false);
        resetForm();
        fetchBaseManagements();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update base');
      }
    } catch (error) {
      console.error('Error updating base:', error);
      toast.error('Error updating base');
    }
  };

  const handleDeleteBase = async (id: string) => {
    if (!confirm('Are you sure you want to remove this base designation?')) return;

    try {
      const response = await fetch(`/api/base-management/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Base removed successfully');
        fetchBaseManagements();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove base');
      }
    } catch (error) {
      console.error('Error removing base:', error);
      toast.error('Error removing base');
    }
  };

  const resetForm = () => {
    setFormData({
      airfieldId: '',
      baseManagerId: undefined,
      additionalInfo: '',
      facilities: [],
      operatingHours: '',
      emergencyContact: '',
      notes: ''
    });
    setSelectedBase(null);
  };

  const openEditDialog = (base: BaseManagement) => {
    setSelectedBase(base);
    setFormData({
      airfieldId: base.airfieldId,
      baseManagerId: base.baseManagerId || undefined,
      additionalInfo: base.additionalInfo || '',
      facilities: base.facilities,
      operatingHours: base.operatingHours || '',
      emergencyContact: base.emergencyContact || '',
      notes: base.notes || ''
    });
    setShowEditDialog(true);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'AIRPORT':
        return 'bg-primary-10 text-primary border-primary-20';
      case 'HELIPORT':
        return 'bg-success-10 text-success border-success-20';
      case 'ULTRALIGHT_FIELD':
        return 'bg-accent-10 text-accent-foreground border-accent-20';
      default:
        return 'bg-muted text-muted-foreground border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Base Management</h1>
          <p className="text-muted-foreground">
            Designate airfields as bases and assign base managers
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Designate Base
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Designate New Base</DialogTitle>
              <DialogDescription>
                Select an airfield to designate as a base and assign a base manager
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="airfieldId">Select Airfield</Label>
                <Combobox
                  options={airfields
                    .filter(af => !af.isBase)
                    .map(airfield => ({
                      value: airfield.id,
                      label: `${airfield.name} (${airfield.code}) • ${airfield.city}, ${airfield.country}`
                    }))}
                  value={formData.airfieldId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, airfieldId: value }))}
                    placeholder="Search airfields by name, code, or city..."
                  searchPlaceholder="Search airfields..."
                  emptyText="No airfields found."
                />
              </div>
              <div>
                <Label htmlFor="baseManagerId">Assign Base Manager</Label>
                <Select value={formData.baseManagerId} onValueChange={(value) => setFormData(prev => ({ ...prev, baseManagerId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a base manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {baseManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName} ({manager.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="operatingHours">Operating Hours</Label>
                <Input
                  id="operatingHours"
                  value={formData.operatingHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, operatingHours: e.target.value }))}
                  placeholder="e.g., Mon-Fri 8:00-18:00"
                />
              </div>
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="Emergency contact information"
                />
              </div>
              <div>
                <Label htmlFor="additionalInfo">Base Information</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                  placeholder="Additional information about this base"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBase}>
                Designate Base
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading bases...</div>
      ) : baseManagements.length === 0 ? (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No bases designated yet. Designate your first base to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {baseManagements.map((base) => (
            <Card key={base.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-primary-10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Plane className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg leading-tight min-h-[2.5rem] flex items-center">{base.airfield.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`text-xs ${getTypeBadgeColor(base.airfield.type)}`}>
                          {base.airfield.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {canEdit && (
                      <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(base)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBase(base.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{base.airfield.code}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {base.airfield.city}, {base.airfield.country}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      {base.baseManager ? (
                        <>
                          <div className="font-medium truncate">
                            {base.baseManager.firstName} {base.baseManager.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{base.baseManager.email}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No manager assigned</span>
                      )}
                    </div>
                  </div>

                  {base.operatingHours && (
                    <div className="text-sm">
                      <span className="font-medium">Hours:</span> 
                      <span className="truncate block">{base.operatingHours}</span>
                    </div>
                  )}

                  {base.emergencyContact && (
                    <div className="text-sm">
                      <span className="font-medium">Emergency:</span> 
                      <span className="truncate block">{base.emergencyContact}</span>
                    </div>
                  )}

                  {base.additionalInfo && (
                    <div className="text-sm">
                      <span className="font-medium">Info:</span> 
                      <span className="truncate block">{base.additionalInfo}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <Badge className={base.isActive ? 'bg-success-10 text-success border-success-20' : 'bg-destructive-10 text-destructive border-destructive-20'}>
                    {base.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                                      <div className="text-xs text-muted-foreground">
                    Created {formatDateWithCurrentFormat(base.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Base</DialogTitle>
            <DialogDescription>
              Update base information and manager assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editBaseManagerId">Base Manager</Label>
              <Select 
                value={formData.baseManagerId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, baseManagerId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a base manager" />
                </SelectTrigger>
                <SelectContent>
                  {baseManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editOperatingHours">Operating Hours</Label>
              <Input
                id="editOperatingHours"
                value={formData.operatingHours}
                onChange={(e) => setFormData(prev => ({ ...prev, operatingHours: e.target.value }))}
                placeholder="e.g., Mon-Fri 8:00-18:00"
              />
            </div>
            <div>
              <Label htmlFor="editEmergencyContact">Emergency Contact</Label>
              <Input
                id="editEmergencyContact"
                value={formData.emergencyContact}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                placeholder="Emergency contact information"
              />
            </div>
            <div>
              <Label htmlFor="editAdditionalInfo">Base Information</Label>
              <Textarea
                id="editAdditionalInfo"
                value={formData.additionalInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                placeholder="Additional information about this base"
              />
            </div>
            <div>
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBase}>
              Update Base
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 