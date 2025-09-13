'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Modal } from './ui/Modal';
import { 
  Clock, 
  ShoppingCart, 
  CheckCircle, 
  Star, 
  Euro, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';

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

interface HourPackage {
  id: string;
  name: string;
  hours: number;
  price: number;
  price_per_hour: number;
  popular?: boolean;
  description?: string;
  features?: string[];
  validity_days: number;
  currency: string;
  is_active: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userRoles?: Array<{
    roles: {
      name: string;
    };
  }>;
  roles?: string[];
}

export default function HourPackages() {
  const [packages, setPackages] = useState<HourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<HourPackage | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Management states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState<HourPackage | null>(null);

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

  // Check if user is admin or super admin
  const isAdmin = currentUser?.userRoles?.some(ur => 
    ur.roles?.name === 'SUPER_ADMIN' || ur.roles?.name === 'ADMIN'
  ) || currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.roles?.includes('ADMIN');



  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  // Fetch hour packages from API
  const fetchPackages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch('/api/hour-packages/templates?activeOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch packages`);
      }

      const data = await response.json();
      
      // Transform API data to match our interface
      const transformedPackages: HourPackage[] = data.templates.map((template: HourPackageTemplate) => ({
        id: template.id,
        name: template.name,
        hours: template.hours,
        price: template.total_price,
        price_per_hour: template.price_per_hour,
        description: template.description,
        validity_days: template.validity_days,
        currency: template.currency,
        is_active: template.is_active,
        features: [
          'Flexible scheduling',
          'No expiration fees',
          'Familiarization included',
          'Fuel included',
          'Basic insurance included'
        ]
      }));

      // Mark the package with the best value as popular (lowest price per hour)
      if (transformedPackages.length > 0) {
        const bestValuePackage = transformedPackages.reduce((best, current) => 
          current.price_per_hour < best.price_per_hour ? current : best
        );
        bestValuePackage.popular = true;
      }

      setPackages(transformedPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load hour packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchPackages();
  }, []);

  const handlePackageSelection = (pkg: HourPackage) => {
    setSelectedPackage(pkg);
    setIsOrderModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsOrderModalOpen(false);
    setSelectedPackage(null);
  };

  const handleConfirmOrder = async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      // Call our microservice to issue proforma invoice
      const response = await fetch('/api/hour-packages/order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          hours: selectedPackage.hours,
          pricePerHour: selectedPackage.price_per_hour,
          totalPrice: selectedPackage.price,
          currency: selectedPackage.currency,
          validityDays: selectedPackage.validity_days,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      const result = await response.json();
      
      toast.success(`Order placed successfully! ${selectedPackage.hours} hours package ordered.`, {
        description: `Proforma invoice ${result.data.invoiceNumber} has been generated and sent.`,
        duration: 5000,
      });
      
      handleCloseModal();
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Management functions
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
    setIsEditMode(false);
  };

  const handleCreatePackage = async () => {
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
        throw new Error(errorData.error || 'Failed to create package');
      }

      toast.success('Hour package created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error('Failed to create hour package');
    }
  };

  const handleUpdatePackage = async () => {
    if (!selectedPackage) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/hour-packages/templates/${selectedPackage.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update package');
      }

      toast.success('Hour package updated successfully');
      setIsEditMode(false);
      resetForm();
      fetchPackages();
    } catch (error) {
      console.error('Error updating package:', error);
      toast.error('Failed to update hour package');
    }
  };

  const handleDeletePackage = async () => {
    if (!deletingPackage) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/hour-packages/templates/${deletingPackage.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete package');
      }

      toast.success('Hour package deleted successfully');
      setDeletingPackage(null);
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete hour package');
    }
  };

  const openViewDialog = (pkg: HourPackage) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      hours: pkg.hours,
      price_per_hour: pkg.price_per_hour,
      total_price: pkg.price,
      currency: pkg.currency,
      validity_days: pkg.validity_days,
      is_active: pkg.is_active,
    });
    setIsEditMode(false);
    setIsViewDialogOpen(true);
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

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatPricePerHour = (pricePerHour: number, currency: string = 'EUR') => {
    return formatCurrency(pricePerHour, currency);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-card-foreground">Hour Packages</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect hour package for your flying needs. All packages include aircraft rental, 
            fuel, and basic insurance.
          </p>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="text-center pb-4">
                <div className="h-8 w-8 bg-gray-200 rounded mx-auto mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-3 bg-gray-200 rounded"></div>
                  ))}
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-card-foreground">Hour Packages</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect hour package for your flying needs. All packages include aircraft rental, 
            fuel, and basic insurance.
          </p>
        </div>
        
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No hour packages available at the moment.</p>
            <p className="text-sm">Please check back later or contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-center space-y-2 flex-1">
        <h1 className="text-3xl font-bold text-card-foreground">Hour Packages</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect hour package for your flying needs. All packages include aircraft rental, 
            fuel, and basic insurance.
          </p>
        </div>
        
        {isAdmin && (
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePackage}>
                  Create Package
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Package Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
        packages.length >= 4 && packages.length % 4 === 0 
          ? 'lg:grid-cols-4' 
          : packages.length >= 3 && packages.length % 3 === 0 
            ? 'lg:grid-cols-3' 
            : 'lg:grid-cols-4'
      }`}>
        {packages.map((pkg) => (
          <Card 
            key={pkg.id} 
            className={`relative cursor-pointer transition-shadow hover:shadow-lg ${
              pkg.popular ? 'ring-2 ring-primary' : ''
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Best Value
                </Badge>
              </div>
            )}
            
            {isAdmin && (
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openViewDialog(pkg)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedPackage(pkg);
                      setFormData({
                        name: pkg.name,
                        description: pkg.description || '',
                        hours: pkg.hours,
                        price_per_hour: pkg.price_per_hour,
                        total_price: pkg.price,
                        currency: pkg.currency,
                        validity_days: pkg.validity_days,
                        is_active: pkg.is_active,
                      });
                      setIsEditMode(true);
                      setIsViewDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Package
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeletingPackage(pkg)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Package
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            
            <CardHeader className="text-center pb-4" onClick={() => handlePackageSelection(pkg)}>
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {pkg.hours} Hours
              </CardTitle>
              <CardDescription className="text-sm">
                {pkg.description || `${pkg.hours} flight hours package`}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4" onClick={() => handlePackageSelection(pkg)}>
              {/* Price */}
              <div className="text-center">
                <div className="text-3xl font-bold text-card-foreground">
                  {formatPricePerHour(pkg.price_per_hour, pkg.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  per flight hour
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {formatCurrency(pkg.price, pkg.currency)}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {pkg.features?.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Select Button */}
              <Button 
                className="w-full mt-4" 
                variant={pkg.popular ? "default" : "outline"}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Select Package
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Flexible Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Book your flights at your convenience. Our flexible scheduling system allows you to 
              plan your training around your busy schedule.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              No Hidden Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Transparent pricing with no surprise charges. All packages include aircraft rental, 
              fuel, and basic insurance coverage.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" />
              Expert Instruction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Learn from experienced instructors with thousands of flight hours. 
              Personalized training plans for every skill level.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Confirmation Modal */}
      <Modal
        open={isOrderModalOpen}
        onClose={handleCloseModal}
        title="Confirm Package Order"
      >
          {selectedPackage && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Package:</span>
                  <span className="font-bold">{selectedPackage.hours} Hours</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Total Price:</span>
                <span className="font-bold text-lg">{formatCurrency(selectedPackage.price, selectedPackage.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Price per Hour:</span>
                <span className="font-medium">{formatPricePerHour(selectedPackage.price_per_hour, selectedPackage.currency)}</span>
              </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>• Includes aircraft rental, fuel, and basic insurance</p>
                <p>• Flexible scheduling available</p>
                {selectedPackage.popular && (
                <p className="text-primary font-medium">• Best value package!</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-6">
            <Button variant="outline" onClick={handleCloseModal} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmOrder} 
              disabled={isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </div>
      </Modal>

      {/* View/Edit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Hour Package' : 'Package Details'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the hour package template' : 'View package information'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Package Name</Label>
              <Input
                id="view-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 10 Hours Package"
                readOnly={!isEditMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-description">Description</Label>
              <Textarea
                id="view-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the package..."
                readOnly={!isEditMode}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="view-hours">Hours</Label>
                <Input
                  id="view-hours"
                  type="number"
                  value={formData.hours}
                  onChange={(e) => handleHoursChange(Number(e.target.value))}
                  placeholder="10"
                  readOnly={!isEditMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="view-price-per-hour">Price per Hour (€)</Label>
                <Input
                  id="view-price-per-hour"
                  type="number"
                  step="0.01"
                  value={formData.price_per_hour}
                  onChange={(e) => handlePricePerHourChange(Number(e.target.value))}
                  placeholder="120.00"
                  readOnly={!isEditMode}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="view-total-price">Total Price (€)</Label>
                <Input
                  id="view-total-price"
                  type="number"
                  step="0.01"
                  value={formData.total_price}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="view-is-active"
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_active: checked }))}
                disabled={!isEditMode}
              />
              <Label htmlFor="view-is-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </Button>
                <Button onClick={handleUpdatePackage}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPackage} onOpenChange={() => setDeletingPackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hour Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPackage?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPackage(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePackage}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 