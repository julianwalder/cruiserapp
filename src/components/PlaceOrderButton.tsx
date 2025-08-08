'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Download,
  ExternalLink,
  Building,
  User,
  MapPin,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './ui/Modal';

interface HourPackage {
  id: string;
  name: string;
  description: string;
  hours: number;
  price: number;
  currency: string;
  validityDays: number;
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

interface PlaceOrderButtonProps {
  package: HourPackage;
  userData: UserData;
  onOrderPlaced?: (orderData: any) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PlaceOrderButton({ 
  package: hourPackage, 
  userData, 
  onOrderPlaced,
  className,
  variant = 'default',
  size = 'default'
}: PlaceOrderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'proforma' | 'fiscal'>('proforma');
  const [paymentLink, setPaymentLink] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/orders/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId: hourPackage.id,
          paymentMethod,
          paymentLink,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOrderResult(result.data);
        onOrderPlaced?.(result.data);
        toast.success('Order placed successfully!');
        setShowOrderModal(false);
      } else {
        toast.error(result.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <>
      <Button
        onClick={() => setShowOrderModal(true)}
        className={className}
        variant={variant}
        size={size}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <ShoppingCart className="h-4 w-4 mr-2" />
        )}
        Place Order
      </Button>

      {/* Order Modal */}
      <Modal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="Place Order"
        description="Review your order details and place your order"
      >
        <div className="space-y-6">
          {/* Package Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Package:</span>
                <span>{hourPackage.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Hours:</span>
                <span>{hourPackage.hours} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Price:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(hourPackage.price, hourPackage.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Validity:</span>
                <span>{hourPackage.validityDays} days</span>
              </div>
            </CardContent>
          </Card>

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
                <h4 className="text-sm font-medium">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    {getDataStatusIcon(!!userData.firstName && !!userData.lastName)}
                    <span className="text-sm">
                      {getDataStatusText(!!userData.firstName && !!userData.lastName, 'Full Name')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDataStatusIcon(!!userData.email)}
                    <span className="text-sm">
                      {getDataStatusText(!!userData.email, 'Email')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDataStatusIcon(!!userData.phone)}
                    <span className="text-sm">
                      {getDataStatusText(!!userData.phone, 'Phone')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDataStatusIcon(!!userData.cnp || !!userData.idNumber)}
                    <span className="text-sm">
                      {getDataStatusText(!!userData.cnp || !!userData.idNumber, 'ID Number')}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Address Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    {getDataStatusIcon(!!userData.address)}
                    <span className="text-sm">
                      {getDataStatusText(!!userData.address, 'Address')}
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
                </div>
              </div>

              {/* Company Information */}
              {userData.companyId && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Company Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={paymentMethod} onValueChange={(value: 'proforma' | 'fiscal') => setPaymentMethod(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="proforma" id="proforma" />
                  <Label htmlFor="proforma">Proforma Invoice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fiscal" id="fiscal" />
                  <Label htmlFor="fiscal">Fiscal Invoice</Label>
                </div>
              </RadioGroup>

              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paymentLink"
                  checked={paymentLink}
                  onCheckedChange={(checked) => setPaymentLink(checked as boolean)}
                />
                <Label htmlFor="paymentLink">Generate Payment Link</Label>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowOrderModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Placing Order...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
