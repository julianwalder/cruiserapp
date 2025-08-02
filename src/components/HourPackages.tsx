'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Modal } from './ui/Modal';
import { Clock, ShoppingCart, CheckCircle, Star } from 'lucide-react';
import { toast } from 'sonner';

interface HourPackage {
  hours: number;
  price: number;
  popular?: boolean;
  description?: string;
  features?: string[];
}

const availablePackages: HourPackage[] = [
  {
    hours: 10,
    price: 1500,
    description: 'Perfect for occasional flying',
    features: ['Flexible scheduling', 'Valid for 12 months', 'No expiration fees']
  },
  {
    hours: 15,
    price: 2100,
    description: 'Great value for regular pilots',
    features: ['Better hourly rate', 'Valid for 12 months', 'Priority booking']
  },
  {
    hours: 20,
    price: 2800,
    popular: true,
    description: 'Most popular choice',
    features: ['Best value', 'Valid for 12 months', 'Priority booking', 'Free ground school session']
  },
  {
    hours: 25,
    price: 3400,
    description: 'For serious aviators',
    features: ['Premium rate', 'Valid for 12 months', 'Priority booking', 'Free ground school session', 'Instructor consultation']
  }
];

export default function HourPackages() {
  const [selectedPackage, setSelectedPackage] = useState<HourPackage | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
      // Simulate API call for ordering
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Order placed successfully! ${selectedPackage.hours} hours package ordered.`);
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const formatPricePerHour = (totalPrice: number, hours: number) => {
    const pricePerHour = totalPrice / hours;
    return formatCurrency(pricePerHour);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-card-foreground">Hour Packages</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect hour package for your flying needs. All packages include aircraft rental, 
          fuel, and basic insurance. Valid for 12 months from purchase date.
        </p>
      </div>

      {/* Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {availablePackages.map((pkg) => (
          <Card 
            key={pkg.hours} 
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              pkg.popular ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handlePackageSelection(pkg)}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Most Popular
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
                {pkg.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Price */}
              <div className="text-center">
                <div className="text-3xl font-bold text-card-foreground">
                  {formatCurrency(pkg.price)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatPricePerHour(pkg.price, pkg.hours)} per hour
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {pkg.features?.map((feature, index) => (
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
                  <span className="font-bold text-lg">{formatCurrency(selectedPackage.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Price per Hour:</span>
                  <span className="font-medium">{formatPricePerHour(selectedPackage.price, selectedPackage.hours)}</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>• Valid for 12 months from purchase date</p>
                <p>• Includes aircraft rental, fuel, and basic insurance</p>
                <p>• Flexible scheduling available</p>
                {selectedPackage.popular && (
                  <p className="text-primary font-medium">• Popular package with best value!</p>
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