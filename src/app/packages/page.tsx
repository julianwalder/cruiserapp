'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Plane, Check, Star, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { HourPackageService } from '@/lib/hour-package-service';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

interface Package {
  id: string;
  name: string;
  hours: number;
  price: number;
  originalPrice?: number;
  currency: string;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
  icon: React.ReactNode;
}

export default function PackagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const packages: Package[] = [
    {
      id: 'starter',
      name: 'Starter Package',
      hours: 10,
      price: 1500,
      originalPrice: 1800,
      currency: 'RON',
      features: [
        '10 flight hours',
        'Basic ground instruction',
        'Flight planning support',
        'Standard aircraft access'
      ],
      icon: <Clock className="h-6 w-6" />
    },
    {
      id: 'standard',
      name: 'Standard Package',
      hours: 15,
      price: 2100,
      originalPrice: 2700,
      currency: 'RON',
      features: [
        '15 flight hours',
        'Comprehensive ground instruction',
        'Flight planning support',
        'Priority aircraft booking',
        'Progress tracking'
      ],
      popular: true,
      icon: <Plane className="h-6 w-6" />
    },
    {
      id: 'advanced',
      name: 'Advanced Package',
      hours: 20,
      price: 2600,
      originalPrice: 3600,
      currency: 'RON',
      features: [
        '20 flight hours',
        'Advanced ground instruction',
        'Flight planning support',
        'Priority aircraft booking',
        'Progress tracking',
        'Simulator access (2 hours)'
      ],
      bestValue: true,
      icon: <Zap className="h-6 w-6" />
    },
    {
      id: 'premium',
      name: 'Premium Package',
      hours: 30,
      price: 3600,
      originalPrice: 5400,
      currency: 'RON',
      features: [
        '30 flight hours',
        'Premium ground instruction',
        'Flight planning support',
        'Priority aircraft booking',
        'Progress tracking',
        'Simulator access (5 hours)',
        'Dedicated instructor',
        'Flexible scheduling'
      ],
      icon: <Crown className="h-6 w-6" />
    }
  ];

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    toast.success(`Selected ${pkg.name} - ${pkg.hours} hours`);
  };

  const handlePurchase = async (pkg: Package) => {
    try {
      if (!user) {
        toast.error('User not found');
        return;
      }

      // Here you would integrate with your payment system
      // For now, we'll just create the hour package directly
      toast.success(`Processing purchase for ${pkg.name}...`);
      
      // Create hour package
      await HourPackageService.createHourPackage(
        user.id,
        pkg.name,
        pkg.hours,
        pkg.price,
        pkg.currency
      );

      toast.success(`Purchase successful! ${pkg.hours} hours have been added to your account.`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase. Please try again.');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Flight Hour Packages
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Choose the perfect package to advance your flying career
            </p>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedPackage?.id === pkg.id 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:scale-105'
              }`}
              onClick={() => handlePackageSelect(pkg)}
            >
              {pkg.popular && (
                <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white">
                  Most Popular
                </Badge>
              )}
              
              {pkg.bestValue && (
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                  Best Value
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                    {pkg.icon}
                  </div>
                </div>
                <CardTitle className="text-xl">{pkg.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {pkg.hours}
                  </span> flight hours
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(pkg.price, pkg.currency)}
                  </div>
                  {pkg.originalPrice && (
                    <div className="text-sm text-gray-500 line-through">
                      {formatCurrency(pkg.originalPrice, pkg.currency)}
                    </div>
                  )}
                  <div className="text-sm text-green-600 font-medium">
                    {pkg.originalPrice && 
                      `${Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% savings`
                    }
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {pkg.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <Button 
                  className={`w-full ${
                    selectedPackage?.id === pkg.id 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchase(pkg);
                  }}
                >
                  {selectedPackage?.id === pkg.id ? 'Purchase Now' : 'Select Package'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Package Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Hours never expire</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Flexible scheduling</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Professional instruction</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Progress tracking</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">1</div>
                <span className="text-sm">Select your preferred package</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">2</div>
                <span className="text-sm">Complete secure payment</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">3</div>
                <span className="text-sm">Hours added to your account</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">4</div>
                <span className="text-sm">Start flying immediately</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 