import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, Building, Globe } from 'lucide-react';

interface VeriffAddressDetailsProps {
  veriffData: any;
}

export function VeriffAddressDetails({ veriffData }: VeriffAddressDetailsProps) {
  console.log('🏠 VeriffAddressDetails received data:', veriffData);
  
  // Extract address information from various possible sources in veriffData
  const addressData = {
    // From webhook data person object
    fullAddress: veriffData?.webhookData?.person?.address,
    
    // From document country
    country: veriffData?.document?.country || veriffData?.person?.country,
    
    // From direct webhook address field (if exists)
    street: veriffData?.webhookData?.address?.street,
    city: veriffData?.webhookData?.address?.city,
    state: veriffData?.webhookData?.address?.state,
    postalCode: veriffData?.webhookData?.address?.postalCode,
    
    // Alternative structure - check if address is directly in webhookData
    directAddress: veriffData?.webhookData?.address,
    
    // Check if there's an address field in the root
    rootAddress: veriffData?.address
  };
  
  console.log('🏠 Extracted address data:', addressData);
  
  // Check if we have any address data to display
  const hasAddressData = 
    addressData.fullAddress ||
    addressData.street ||
    addressData.city ||
    addressData.state ||
    addressData.country ||
    addressData.postalCode ||
    addressData.directAddress ||
    addressData.rootAddress;

  if (!hasAddressData) {
    console.log('🏠 No address data found, returning null');
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Address Details
        </CardTitle>
        <CardDescription>
          Address information extracted from your identity document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Full Address */}
        {addressData.fullAddress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Home className="h-4 w-4" />
              Full Address
            </div>
            <p className="text-sm">{addressData.fullAddress}</p>
          </div>
        )}

        {/* Direct Address Object */}
        {addressData.directAddress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Home className="h-4 w-4" />
              Address (Direct)
            </div>
            <p className="text-sm">{JSON.stringify(addressData.directAddress, null, 2)}</p>
          </div>
        )}

        {/* Root Address */}
        {addressData.rootAddress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Home className="h-4 w-4" />
              Address (Root)
            </div>
            <p className="text-sm">{JSON.stringify(addressData.rootAddress, null, 2)}</p>
          </div>
        )}

        {/* Street Address */}
        {addressData.street && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building className="h-4 w-4" />
              Street Address
            </div>
            <p className="text-sm">{addressData.street}</p>
          </div>
        )}

        {/* City and State */}
        {(addressData.city || addressData.state) && (
          <div className="grid grid-cols-2 gap-4">
            {addressData.city && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">City</div>
                <p className="text-sm">{addressData.city}</p>
              </div>
            )}
            {addressData.state && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">State/Province</div>
                <p className="text-sm">{addressData.state}</p>
              </div>
            )}
          </div>
        )}

        {/* Country and Postal Code */}
        <div className="grid grid-cols-2 gap-4">
          {addressData.country && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                Country
              </div>
              <Badge variant="outline">{addressData.country}</Badge>
            </div>
          )}
          {addressData.postalCode && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Postal Code</div>
              <Badge variant="outline">{addressData.postalCode}</Badge>
            </div>
          )}
        </div>

        {/* Debug: Show raw data structure */}
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Debug: Available Data</h4>
          <pre className="text-xs overflow-auto max-h-48">
            {JSON.stringify({
              hasWebhookData: !!veriffData?.webhookData,
              hasPersonData: !!veriffData?.person,
              hasDocumentData: !!veriffData?.document,
              webhookDataKeys: veriffData?.webhookData ? Object.keys(veriffData.webhookData) : [],
              extractedAddress: addressData
            }, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
