'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface HourPackageTemplate {
  id: string;
  name: string;
  description?: string;
  hours: number;
  price_per_hour: number;
  total_price: number;
  currency: string;
  validity_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function HourPackagesTab() {
  const [templates, setTemplates] = useState<HourPackageTemplate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<HourPackageTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<HourPackageTemplate | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hours: 0,
    price_per_hour: 0,
    total_price: 0,
    currency: 'EUR',
    validity_days: 365,
    is_active: true,
  });

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        activeOnly: activeOnly.toString(),
      });

      const response = await fetch(`/api/hour-packages/templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch templates`);
      }

      const data = await response.json();
      setTemplates(data.templates);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch hour packages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/hour-packages/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create template');
      }

      toast.success('Hour package created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create hour package');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/hour-packages/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update template');
      }

      toast.success('Hour package updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update hour package');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/hour-packages/templates/${deletingTemplate.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete template');
      }

      toast.success('Hour package deleted successfully');
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete hour package');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      hours: 0,
      price_per_hour: 0,
      total_price: 0,
      currency: 'EUR',
      validity_days: 365,
      is_active: true,
    });
    setEditingTemplate(null);
  };

  const openEditDialog = (template: HourPackageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      hours: template.hours,
      price_per_hour: template.price_per_hour,
      total_price: template.total_price,
      currency: template.currency,
      validity_days: template.validity_days,
      is_active: template.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handlePricePerHourChange = (value: number) => {
    const newPricePerHour = value;
    const newTotalPrice = newPricePerHour * formData.hours;
    setFormData(prev => ({ ...prev, price_per_hour: newPricePerHour, total_price: newTotalPrice }));
  };

  const handleHoursChange = (value: number) => {
    const newHours = value;
    const newTotalPrice = formData.price_per_hour * newHours;
    setFormData(prev => ({ ...prev, hours: newHours, total_price: newTotalPrice }));
  };

  useEffect(() => {
    fetchTemplates();
  }, [pagination.page, searchTerm, activeOnly]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hour Package Management</h2>
          <p className="text-muted-foreground">
            Manage hour packages that pilots can purchase for aircraft rental
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Hour Package</DialogTitle>
              <DialogDescription>
                Create a new hour package template for pilots to purchase
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., 10 Hours Package"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the package..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    value={formData.hours}
                    onChange={(e) => handleHoursChange(Number(e.target.value))}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_hour">Price per Hour (€)</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    step="0.01"
                    value={formData.price_per_hour}
                    onChange={(e) => handlePricePerHourChange(Number(e.target.value))}
                    placeholder="120.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_price">Total Price (€)</Label>
                  <Input
                    id="total_price"
                    type="number"
                    step="0.01"
                    value={formData.total_price}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validity_days">Validity (days)</Label>
                  <Input
                    id="validity_days"
                    type="number"
                    value={formData.validity_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, validity_days: Number(e.target.value) }))}
                    placeholder="365"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Package
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="active-only"
            checked={activeOnly}
            onCheckedChange={(checked: boolean) => setActiveOnly(checked)}
          />
          <Label htmlFor="active-only">Active Only</Label>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                <Badge 
                  variant={template.is_active ? "default" : "secondary"}
                  className={template.is_active ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" : ""}
                >
                  {template.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{template.hours} hours</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-gray-500" />
                  <span>€{template.price_per_hour}/hr</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  €{template.total_price}
                </div>
                <div className="text-sm text-muted-foreground">
                  Valid for {template.validity_days} days
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditDialog(template)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Hour Package</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{template.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingTemplate(null)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTemplate}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Hour Package</DialogTitle>
            <DialogDescription>
              Update the hour package template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Package Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 10 Hours Package"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the package..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hours">Hours</Label>
                <Input
                  id="edit-hours"
                  type="number"
                  value={formData.hours}
                  onChange={(e) => handleHoursChange(Number(e.target.value))}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price-per-hour">Price per Hour (€)</Label>
                <Input
                  id="edit-price-per-hour"
                  type="number"
                  step="0.01"
                  value={formData.price_per_hour}
                  onChange={(e) => handlePricePerHourChange(Number(e.target.value))}
                  placeholder="120.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-total-price">Total Price (€)</Label>
                <Input
                  id="edit-total-price"
                  type="number"
                  step="0.01"
                  value={formData.total_price}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-validity-days">Validity (days)</Label>
                <Input
                  id="edit-validity-days"
                  type="number"
                  value={formData.validity_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, validity_days: Number(e.target.value) }))}
                  placeholder="365"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is-active"
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="edit-is-active">Active</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>
              Update Package
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 