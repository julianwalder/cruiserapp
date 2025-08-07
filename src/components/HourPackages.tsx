'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Modal } from './ui/Modal';
import { Clock, ShoppingCart, CheckCircle, Star, Euro } from 'lucide-react';
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
  hours: number;
  price: number;
  price_per_hour: number;
  popular?: boolean;
  description?: string;
  features?: string[];
  validity_days: number;
  currency: string;
}

export default function HourPackages() {
  const [packages, setPackages] = useState<HourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<HourPackage | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
        hours: template.hours,
        price: template.total_price,
        price_per_hour: template.price_per_hour,
        description: template.description,
        validity_days: template.validity_days,
        currency: template.currency,
        features: [
          'Flexible scheduling',
          `Valid for ${template.validity_days} days`,
          'No expiration fees',
          'Aircraft rental included',
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
      // TODO: Implement actual order placement API call
      // For now, simulate API call for ordering
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Order placed successfully! ${selectedPackage.hours} hours package ordered.`);
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-card-foreground">Hour Packages</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect hour package for your flying needs. All packages include aircraft rental, 
          fuel, and basic insurance. Valid for the specified duration from purchase date.
        </p>
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
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              pkg.popular ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handlePackageSelection(pkg)}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Best Value
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
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
            
            <CardContent className="space-y-4">
              {/* Price */}
              <div className="text-center">
                <div className="text-3xl font-bold text-card-foreground">
                  {formatCurrency(pkg.price, pkg.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatPricePerHour(pkg.price_per_hour, pkg.currency)} per hour
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
        description="Review your selected hour package before placing the order."
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
                <div className="flex items-center justify-between mt-2">
                  <span className="font-medium">Validity:</span>
                  <span className="font-medium">{selectedPackage.validity_days} days</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>• Valid for {selectedPackage.validity_days} days from purchase date</p>
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
    </div>
  );
} 