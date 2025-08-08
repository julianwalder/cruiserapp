'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  GraduationCap, 
  Plane, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Shield, 
  FileText,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Info,
  Star,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { VeriffVerification } from '@/components/ui/veriff-verification';

interface OnboardingFlowProps {
  onboardingType: 'STUDENT' | 'PILOT';
  onComplete: () => void;
  onCancel: () => void;
  userId: string;
  userData: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  planType: 'INSTALLMENT' | 'FULL_PAYMENT';
  totalAmount: number;
  numberOfInstallments?: number;
  discountPercentage: number;
  currency: string;
}

interface HourPackage {
  id: string;
  name: string;
  description: string;
  totalHours: number;
  price: number;
  currency: string;
  validityDays: number;
  features?: string[];
  popular?: boolean;
}

const studentPaymentPlans: PaymentPlan[] = [
  {
    id: '1',
    name: '4 Installments',
    description: 'Pay in 4 equal monthly installments',
    planType: 'INSTALLMENT',
    totalAmount: 15000,
    numberOfInstallments: 4,
    discountPercentage: 0,
    currency: 'RON'
  },
  {
    id: '2',
    name: '2 Installments',
    description: 'Pay in 2 installments with 5% discount',
    planType: 'INSTALLMENT',
    totalAmount: 14250,
    numberOfInstallments: 2,
    discountPercentage: 5,
    currency: 'RON'
  },
  {
    id: '3',
    name: 'Full Payment',
    description: 'Pay in full with 10% discount',
    planType: 'FULL_PAYMENT',
    totalAmount: 13500,
    numberOfInstallments: 1,
    discountPercentage: 10,
    currency: 'RON'
  }
];



export function OnboardingFlow({ onboardingType, onComplete, onCancel, userId, userData }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [pilotHourPackages, setPilotHourPackages] = useState<HourPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Fetch hour packages from API
  useEffect(() => {
    const fetchHourPackages = async () => {
      if (onboardingType === 'PILOT') {
        setPackagesLoading(true);
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
          const transformedPackages: HourPackage[] = data.templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description || `${template.hours} flight hours package`,
            totalHours: template.hours,
            price: template.total_price,
            currency: template.currency,
            validityDays: template.validity_days,
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
              (current.price / current.totalHours) < (best.price / best.totalHours) ? current : best
            );
            bestValuePackage.popular = true;
          }

          setPilotHourPackages(transformedPackages);
        } catch (error) {
          console.error('Error fetching hour packages:', error);
          // Fallback to empty array if API fails
          setPilotHourPackages([]);
        } finally {
          setPackagesLoading(false);
        }
      }
    };

    fetchHourPackages();
  }, [onboardingType]);

  // Helper functions for formatting
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatPricePerHour = (pricePerHour: number, currency: string = 'EUR') => {
    return formatCurrency(pricePerHour, currency);
  };

  const steps = [
    {
      number: 1,
      title: 'Welcome',
      description: onboardingType === 'STUDENT' 
        ? 'Start your PPL(A) journey' 
        : 'Join our aircraft rental program'
    },
    {
      number: 2,
      title: 'Rules & Terms',
      description: 'Accept school/club rules and terms'
    },
    {
      number: 3,
      title: 'Payment Plan',
      description: onboardingType === 'STUDENT' 
        ? 'Choose your payment plan' 
        : 'Select your hour package'
    },
    {
      number: 4,
      title: 'Identity Verification',
      description: 'Verify your identity with Veriff'
    },
    {
      number: 5,
      title: 'Contract & Signature',
      description: 'Review and sign your contract'
    }
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Here you would typically:
      // 1. Create onboarding record
      // 2. Generate contract
      // 3. Update user role
      // 4. Send confirmation email
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Onboarding completed successfully!');
      onComplete();
    } catch (error) {
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 2:
        return acceptedRules;
      case 3:
        return onboardingType === 'STUDENT' ? selectedPlan : selectedPackage;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {onboardingType === 'STUDENT' ? (
                <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <GraduationCap className="h-12 w-12 text-blue-600" />
                </div>
              ) : (
                <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Plane className="h-12 w-12 text-green-600" />
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {onboardingType === 'STUDENT' ? 'Start Your PPL(A) Journey' : 'Join Our Aircraft Rental Program'}
              </h2>
              <p className="text-muted-foreground">
                {onboardingType === 'STUDENT' 
                  ? 'Complete your Private Pilot License (A) course with our experienced instructors.'
                  : 'Access our fleet of well-maintained aircraft for your flying needs.'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration
                </h3>
                <p className="text-sm text-muted-foreground">
                  {onboardingType === 'STUDENT' 
                    ? '3-6 months depending on your schedule'
                    : 'Flexible scheduling based on aircraft availability'
                  }
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Base Airfields
                </h3>
                <p className="text-sm text-muted-foreground">
                  {onboardingType === 'STUDENT' 
                    ? 'LRCJ (Bucharest) & LRPW (Ploiești)'
                    : 'Multiple airfields across Romania'
                  }
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Rules & Terms</h2>
              <p className="text-muted-foreground mb-4">
                Please read and accept the following rules and terms before proceeding.
              </p>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
              {onboardingType === 'STUDENT' ? (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">PPL(A) Course Rules</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Course duration: 3-6 months depending on your availability</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Base airfields: LRCJ (Bucharest) and LRPW (Ploiești)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Minimum 45 hours of flight training required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Theory classes included in the course</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Medical certificate required before solo flights</span>
                      </li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Terms & Conditions</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Payment plans are binding and must be completed as agreed</li>
                      <li>• Course materials and equipment are included in the price</li>
                      <li>• Weather conditions may affect flight schedules</li>
                      <li>• All flights are conducted under instructor supervision until solo authorization</li>
                      <li>• Safety is our top priority - all safety procedures must be followed</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Aircraft Rental Rules</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Valid PPL license and medical certificate required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Radio certificate required for all flights</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Insurance coverage included in rental packages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Aircraft availability subject to maintenance and weather</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Pre-flight inspections mandatory before each flight</span>
                      </li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Terms & Conditions</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Hour packages are valid for 12 months from purchase</li>
                      <li>• Cancellation policy: 24 hours notice required</li>
                      <li>• Fuel costs are included in the package price</li>
                      <li>• Damage or incidents must be reported immediately</li>
                      <li>• All flights must comply with Romanian aviation regulations</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="accept-rules" 
                checked={acceptedRules}
                onCheckedChange={(checked) => setAcceptedRules(checked as boolean)}
              />
              <Label htmlFor="accept-rules" className="text-sm">
                I have read and accept the rules and terms
              </Label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {onboardingType === 'STUDENT' ? 'Choose Your Payment Plan' : 'Select Your Hour Package'}
              </h2>
              <p className="text-muted-foreground">
                {onboardingType === 'STUDENT' 
                  ? 'Select the payment plan that works best for you.'
                  : 'Choose the hour package that fits your flying needs.'
                }
              </p>
            </div>

            {onboardingType === 'STUDENT' ? (
              <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                <div className="grid gap-4">
                  {studentPaymentPlans.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={item.id} id={item.id} />
                      <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                        <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant="outline">
                              {item.discountPercentage}% off
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">
                              {item.totalAmount?.toLocaleString() || '0'} {item.currency}
                            </span>
                            {item.numberOfInstallments && (
                              <span className="text-sm text-muted-foreground">
                                {item.numberOfInstallments} installments
                              </span>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <>
                {packagesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg animate-pulse">
                        <div className="flex items-center justify-between mb-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="flex items-center justify-between">
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pilotHourPackages.length > 0 ? (
                  <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage}>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
                      pilotHourPackages.length >= 4 && pilotHourPackages.length % 4 === 0 
                        ? 'lg:grid-cols-4' 
                        : pilotHourPackages.length >= 3 && pilotHourPackages.length % 3 === 0 
                          ? 'lg:grid-cols-3' 
                          : 'lg:grid-cols-4'
                    }`}>
                      {pilotHourPackages.map((item) => (
                        <div key={item.id} className="relative">
                          <RadioGroupItem value={item.id} id={item.id} className="sr-only" />
                          <Label 
                            htmlFor={item.id} 
                            className="cursor-pointer block"
                            onClick={() => setSelectedPackage(item.id)}
                          >
                            <Card className={`relative transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                              item.popular ? 'ring-2 ring-primary' : ''
                            } ${selectedPackage === item.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                              {item.popular && (
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
                                  {item.totalHours} Hours
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  {item.description}
                                </CardDescription>
                              </CardHeader>
                              
                              <CardContent className="space-y-4">
                                {/* Price */}
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-card-foreground">
                                    {formatCurrency(item.price / item.totalHours, item.currency)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    per flight hour
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Total: {formatCurrency(item.price, item.currency)}
                                  </div>
                                </div>

                                {/* Features */}
                                <div className="space-y-2">
                                  {item.features?.slice(0, 4).map((feature, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                      <span className="text-muted-foreground">{feature}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Select Button */}
                                <Button 
                                  className="w-full mt-4" 
                                  variant={selectedPackage === item.id ? "default" : (item.popular ? "outline" : "outline")}
                                >
                                  {selectedPackage === item.id ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Selected
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="h-4 w-4 mr-2" />
                                      Select Package
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No hour packages available at the moment.</p>
                      <p className="text-sm">Please contact support or check back later.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Shield className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              
              <h2 className="text-xl font-semibold mb-2">Identity Verification</h2>
              <p className="text-muted-foreground">
                We need to verify your identity using Veriff. This is a secure and quick process.
              </p>
            </div>

            <VeriffVerification
              userId={userId}
              userData={{
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
              }}
              onStatusChange={(status) => {
                if (status === 'approved') {
                  // Auto-proceed to next step when verified
                  setTimeout(() => {
                    handleNext();
                  }, 2000);
                }
              }}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <FileText className="h-12 w-12 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-xl font-semibold mb-2">Review & Sign Contract</h2>
              <p className="text-muted-foreground">
                Please review your contract and sign to complete the onboarding process.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contract Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <p className="text-muted-foreground">
                      {onboardingType === 'STUDENT' ? 'PPL(A) Course' : 'Aircraft Rental'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Selected Plan:</span>
                    <p className="text-muted-foreground">
                      {onboardingType === 'STUDENT' 
                        ? studentPaymentPlans.find(p => p.id === selectedPlan)?.name
                        : pilotHourPackages.find(p => p.id === selectedPackage)?.name
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Total Amount:</span>
                    <p className="text-muted-foreground">
                      {onboardingType === 'STUDENT' 
                        ? `${studentPaymentPlans.find(p => p.id === selectedPlan)?.totalAmount?.toLocaleString() || '0'} ${studentPaymentPlans.find(p => p.id === selectedPlan)?.currency || 'RON'}`
                        : `${pilotHourPackages.find(p => p.id === selectedPackage)?.price?.toLocaleString() || '0'} ${pilotHourPackages.find(p => p.id === selectedPackage)?.currency || 'EUR'}`
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p className="text-muted-foreground">
                      {onboardingType === 'STUDENT' 
                        ? '3-6 months' 
                        : `${pilotHourPackages.find(p => p.id === selectedPackage)?.validityDays || 365} days`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center space-x-2">
              <Checkbox id="accept-contract" />
              <Label htmlFor="accept-contract" className="text-sm">
                I agree to the terms and conditions of this contract
              </Label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {onboardingType === 'STUDENT' ? 'PPL(A) Course Onboarding' : 'Aircraft Rental Onboarding'}
          </h1>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep >= step.number 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'border-muted-foreground text-muted-foreground'
            }`}>
              {currentStep > step.number ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{step.number}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${
                currentStep > step.number ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center space-x-2">
          {currentStep < totalSteps ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? 'Completing...' : 'Complete Onboarding'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 