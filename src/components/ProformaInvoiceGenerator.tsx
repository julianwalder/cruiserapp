'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Download,
  ExternalLink,
  Building,
  User,
  MapPin,
  CreditCard as PaymentIcon
} from 'lucide-react';
import { Modal } from './ui/Modal';

// Validation schema for the form
const proformaInvoiceSchema = z.object({
  packageId: z.string().min(1, 'Please select a package'),
  paymentMethod: z.enum(['proforma', 'fiscal']),
  paymentLink: z.boolean().default(false),
});

type ProformaInvoiceForm = z.infer<typeof proformaInvoiceSchema>;

interface HourPackage {
  id: string;
  name: string;
  description: string;
  hours: number;
  price: number;
  currency: string;
  validityDays: number;
}

interface UserInvoiceData {
  userId: string;
  cnp?: string;
  idNumber?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  companyId?: string;
  companyName?: string;
  companyVatCode?: string;
  companyAddress?: string;
  companyCity?: string;
  companyCountry?: string;
}

interface ProformaInvoiceGeneratorProps {
  userId?: string;
  onInvoiceGenerated?: (invoiceData: any) => void;
  onCancel?: () => void;
}

export function ProformaInvoiceGenerator({ 
  userId, 
  onInvoiceGenerated, 
  onCancel 
}: ProformaInvoiceGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<HourPackage[]>([]);
  const [userData, setUserData] = useState<UserInvoiceData | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; missingFields: string[] } | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProformaInvoiceForm>({
    resolver: zodResolver(proformaInvoiceSchema),
    defaultValues: {
      paymentMethod: 'proforma',
      paymentLink: false,
    },
  });

  const selectedPackageId = watch('packageId');
  const paymentMethod = watch('paymentMethod');
  const paymentLink = watch('paymentLink');

  // Fetch hour packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/hour-packages/templates?activeOnly=true', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const transformedPackages: HourPackage[] = data.templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description || `${template.hours} flight hours package`,
            hours: template.hours,
            price: template.total_price,
            currency: template.currency,
            validityDays: template.validity_days,
          }));
          setPackages(transformedPackages);
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
        toast.error('Failed to load hour packages');
      }
    };

    fetchPackages();
  }, []);

  // Fetch user invoice data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const targetUserId = userId || 'me';
        const response = await fetch(`/api/proforma-invoices?userId=${targetUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data.userData);
          setValidation(data.validation);
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || 'Failed to load user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      }
    };

    fetchUserData();
  }, [userId]);

  const onSubmit = async (data: ProformaInvoiceForm) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/proforma-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setGeneratedInvoice(result.data);
        setShowInvoiceModal(true);
        onInvoiceGenerated?.(result.data);
        toast.success('Proforma invoice generated successfully!');
      } else {
        if (result.missingFields) {
          toast.error(`Missing required data: ${result.missingFields.join(', ')}`);
        } else {
          toast.error(result.error || 'Failed to generate invoice');
        }
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDataStatusIcon = (hasData: boolean) => {
    return hasData ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
    );
  };

  const getDataStatusText = (hasData: boolean, label: string) => {
    return hasData ? `${label} - Available` : `${label} - Missing`;
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Generate Proforma Invoice</h2>
          <p className="text-muted-foreground">
            Create proforma invoices and payment links for hour package orders
          </p>
        </div>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* User Data Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Data Validation
          </CardTitle>
          <CardDescription>
            Review the data that will be used for invoice generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.firstName && !!userData.lastName)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.firstName && !!userData.lastName, 'Name')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.email)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.email, 'Email')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.cnp || !!userData.idNumber)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.cnp || !!userData.idNumber, 'CNP/ID Number')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.phone)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.phone, 'Phone')}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.address)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.address, 'Street Address')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.city)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.city, 'City')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.country)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.country, 'Country')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getDataStatusIcon(!!userData.state)}
                <span className="text-sm">
                  {getDataStatusText(!!userData.state, 'State/Region')}
                </span>
              </div>
            </div>
          </div>

          {/* Company Information */}
          {userData.companyId && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Company Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {getDataStatusIcon(!!userData.companyName)}
                    <span className="text-sm">
                      {getDataStatusText(!!userData.companyName, 'Company Name')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDataStatusIcon(!!userData.companyVatCode)}
                    <span className="text-sm">
                      {getDataStatusText(!!userData.companyVatCode, 'VAT Code')}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Validation Status */}
          {validation && (
            <Alert className={validation.valid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <AlertDescription>
                  {validation.valid 
                    ? 'All required data is available for invoice generation'
                    : `Missing required data: ${validation.missingFields.join(', ')}`
                  }
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Invoice Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Configuration
          </CardTitle>
          <CardDescription>
            Configure the invoice details and payment options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Package Selection */}
            <div className="space-y-3">
              <Label htmlFor="packageId">Select Hour Package</Label>
              <RadioGroup 
                value={selectedPackageId} 
                onValueChange={(value) => setValue('packageId', value)}
              >
                <div className="grid gap-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={pkg.id} id={pkg.id} />
                      <Label htmlFor={pkg.id} className="flex-1 cursor-pointer">
                        <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{pkg.name}</h3>
                            <Badge variant="outline">
                              {pkg.hours} hours
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">
                              {formatCurrency(pkg.price, pkg.currency)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Valid for {pkg.validityDays} days
                            </span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {errors.packageId && (
                <p className="text-sm text-destructive">{errors.packageId.message}</p>
              )}
            </div>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>Invoice Type</Label>
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(value) => setValue('paymentMethod', value as 'proforma' | 'fiscal')}
              >
                <div className="grid gap-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="proforma" id="proforma" />
                    <Label htmlFor="proforma" className="flex-1 cursor-pointer">
                      <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Proforma Invoice</h3>
                          <Badge variant="outline">Draft</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Non-fiscal invoice for preview and approval
                        </p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="fiscal" id="fiscal" />
                    <Label htmlFor="fiscal" className="flex-1 cursor-pointer">
                      <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Fiscal Invoice</h3>
                          <Badge variant="outline">Official</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Official fiscal invoice with tax obligations
                        </p>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Payment Link Option */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="paymentLink" 
                  checked={paymentLink}
                  onCheckedChange={(checked) => setValue('paymentLink', checked as boolean)}
                />
                <Label htmlFor="paymentLink" className="flex items-center gap-2">
                  <PaymentIcon className="h-4 w-4" />
                  Generate Payment Link
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Create a secure payment link that can be shared with the customer
              </p>
            </div>

            {/* Package Summary */}
            {selectedPackage && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Package:</span>
                      <span className="font-medium">{selectedPackage.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hours:</span>
                      <span>{selectedPackage.hours} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price per hour:</span>
                      <span>{formatCurrency(selectedPackage.price / selectedPackage.hours, selectedPackage.currency)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedPackage.price, selectedPackage.currency)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {validation?.valid ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Ready to generate invoice
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    Missing required data
                  </span>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !validation?.valid || !selectedPackageId}
              >
                {isLoading ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Generated Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Invoice Generated Successfully"
        size="lg"
      >
        {generatedInvoice && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Invoice Generated Successfully</h3>
              <p className="text-muted-foreground">
                Your proforma invoice has been created and is ready for use.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Invoice ID:</span>
                  <p className="text-muted-foreground">{generatedInvoice.invoiceId}</p>
                </div>
                <div>
                  <span className="font-medium">Smartbill ID:</span>
                  <p className="text-muted-foreground">{generatedInvoice.smartbillId}</p>
                </div>
                <div>
                  <span className="font-medium">Package:</span>
                  <p className="text-muted-foreground">{generatedInvoice.package.name}</p>
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span>
                  <p className="text-muted-foreground">
                    {formatCurrency(generatedInvoice.package.totalPrice, generatedInvoice.package.currency)}
                  </p>
                </div>
              </div>

              {generatedInvoice.paymentLink && (
                <div className="space-y-3">
                  <Label>Payment Link</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={generatedInvoice.paymentLink}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(generatedInvoice.paymentLink)}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(generatedInvoice.paymentLink, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Download invoice PDF (implement based on your needs)
                      toast.info('Download functionality to be implemented');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={() => {
                      setShowInvoiceModal(false);
                      // Navigate to invoices list or dashboard
                    }}
                  >
                    View All Invoices
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
