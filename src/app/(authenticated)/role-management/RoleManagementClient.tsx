'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield, Users, Settings } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Capability {
  id: string;
  name: string;
  action: string;
  description: string;
  isGranted: boolean;
}

interface ResourceCapabilities {
  resourceType: string;
  resourceName: string;
  capabilities: Capability[];
}

interface RoleCapabilities {
  roleId: string;
  capabilities: ResourceCapabilities[];
}

export default function RoleManagementClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleCapabilities, setRoleCapabilities] = useState<RoleCapabilities | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fetch role capabilities when a role is selected
  useEffect(() => {
    if (selectedRole) {
      fetchRoleCapabilities(selectedRole.id);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoleCapabilities = async (roleId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/roles/${roleId}/capabilities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch role capabilities');
      const data = await response.json();
      setRoleCapabilities(data);
    } catch (error) {
      console.error('Error fetching role capabilities:', error);
      toast.error('Failed to fetch role capabilities');
    }
  };

  const createRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(newRole)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create role');
      }

      const role = await response.json();
      setRoles(prevRoles => [...prevRoles, role]);
      setNewRole({ name: '', description: '' });
      setIsCreateDialogOpen(false);
      toast.success('Role created successfully');
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create role');
    }
  };

  const updateRoleCapabilities = async (capabilities: Capability[]) => {
    if (!selectedRole) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/roles/${selectedRole.id}/capabilities`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ capabilities })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update capabilities');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Refresh capabilities
      fetchRoleCapabilities(selectedRole.id);
    } catch (error) {
      console.error('Error updating capabilities:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update capabilities');
    }
  };

  const handleCapabilityToggle = (capabilityId: string, isGranted: boolean) => {
    if (!roleCapabilities) return;

    const updatedCapabilities = roleCapabilities.capabilities.map(resource => ({
      ...resource,
      capabilities: resource.capabilities.map(cap => 
        cap.id === capabilityId ? { ...cap, isGranted } : cap
      )
    }));

    setRoleCapabilities({
      ...roleCapabilities,
      capabilities: updatedCapabilities
    });

    // Find the capability to update
    const capability = roleCapabilities.capabilities
      .flatMap(resource => resource.capabilities)
      .find(cap => cap.id === capabilityId);

    if (capability) {
      updateRoleCapabilities([{ ...capability, isGranted }]);
    }
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'menu': return <Settings className="h-4 w-4" />;
      case 'data': return <Shield className="h-4 w-4" />;
      case 'api': return <Users className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'view': return 'bg-blue-100 text-blue-800';
      case 'create': return 'bg-green-100 text-green-800';
      case 'edit': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'write': return 'bg-purple-100 text-purple-800';
      case 'export': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading role management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Create a new role with a name and description
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g., PILOT, INSTRUCTOR"
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Describe the role's purpose and responsibilities"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createRole} disabled={!newRole.name.trim()}>
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Select a role to manage its capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.isArray(roles) && roles.map((role) => (
                <div
                  key={role.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRole?.id === role.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <div className="font-medium">{role.name}</div>
                  {role.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Capability Matrix */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {selectedRole ? `${selectedRole.name} Capabilities` : 'Select a Role'}
            </CardTitle>
            <CardDescription>
              {selectedRole 
                ? 'Manage what this role can access and modify'
                : 'Choose a role from the list to view and edit its capabilities'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRole && roleCapabilities ? (
              <Tabs defaultValue="menu" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="menu">Menu Access</TabsTrigger>
                  <TabsTrigger value="data">Data Access</TabsTrigger>
                  <TabsTrigger value="api">API Access</TabsTrigger>
                </TabsList>

                {['menu', 'data', 'api'].map((resourceType) => (
                  <TabsContent key={resourceType} value={resourceType} className="space-y-4">
                    {roleCapabilities.capabilities
                      .filter(resource => resource.resourceType === resourceType)
                      .map((resource) => (
                        <div key={`${resource.resourceType}.${resource.resourceName}`} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            {getResourceIcon(resource.resourceType)}
                            <h3 className="font-semibold capitalize">
                              {resource.resourceName.replace('-', ' ')}
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {resource.capabilities.map((capability) => (
                              <div
                                key={capability.id}
                                className="flex items-center space-x-2 p-2 border rounded"
                              >
                                <Checkbox
                                  id={capability.id}
                                  checked={capability.isGranted}
                                  onCheckedChange={(checked) => 
                                    handleCapabilityToggle(capability.id, checked as boolean)
                                  }
                                />
                                <div className="flex-1 min-w-0">
                                  <Label
                                    htmlFor={capability.id}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {capability.action}
                                  </Label>
                                  <Badge className={`text-xs mt-1 ${getActionColor(capability.action)}`}>
                                    {capability.action}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                {selectedRole ? 'Loading capabilities...' : 'Select a role to view capabilities'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
