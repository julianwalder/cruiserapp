'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceOrderButton } from './PlaceOrderButton';
import { Button } from './ui/button';
import { 
  Clock, 
  Euro, 
  Package,
  Loader2
} from 'lucide-react';

interface HourPackage {
  id: string;
  name: string;
  description: string;
  hours: number;
  price: number;
  currency: string;
  validityDays: number;
  isActive: boolean;
}

interface UserData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  cnp?: string;
  idNumber?: string;
  companyId?: string;
  companyName?: string;
  companyVatCode?: string;
  companyAddress?: string;
  companyCity?: string;
  companyCountry?: string;
}

interface HourPackagesListProps {
  className?: string;
}

export function HourPackagesList({ className }: HourPackagesListProps) {
  const [packages, setPackages] = useState<HourPackage[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          return;
        }

        // Fetch packages and user data in parallel
        const [packagesResponse, userResponse] = await Promise.all([
          fetch('/api/hour-packages/templates', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
          fetch('/api/proforma-invoices?userId=me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
        ]);

        if (packagesResponse.ok) {
          const packagesData = await packagesResponse.json();
          setPackages(packagesData.packages || []);
        }

        if (userResponse.ok) {
          const userDataResponse = await userResponse.json();
          setUserData(userDataResponse.userData);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleOrderPlaced = (orderData: any) => {
    console.log('Order placed successfully:', orderData);
    // You can add navigation logic here or show a success message
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center p-8">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No hour packages available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Hour Packages</h2>
        <p className="text-muted-foreground">
          Choose from our available hour packages for flight training
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="relative">
            {!pkg.isActive && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <Badge variant="secondary">Inactive</Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {pkg.name}
              </CardTitle>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Hours:</span>
                <span className="font-medium">{pkg.hours} hours</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Price:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(pkg.price, pkg.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Validity:</span>
                <span className="text-sm">{pkg.validityDays} days</span>
              </div>

              <div className="pt-4">
                {pkg.isActive && userData ? (
                  <PlaceOrderButton
                    package={pkg}
                    userData={userData}
                    onOrderPlaced={handleOrderPlaced}
                    className="w-full"
                  />
                ) : (
                  <Button disabled className="w-full">
                    {!pkg.isActive ? 'Package Inactive' : 'Loading...'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
