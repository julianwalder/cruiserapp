'use client';

import { useState } from 'react';
import { ProformaInvoiceGenerator } from '@/components/ProformaInvoiceGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  ArrowLeft,
  CreditCard,
  Building,
  User,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProformaInvoicesPage() {
  const [activeTab, setActiveTab] = useState('generate');
  const [showGenerator, setShowGenerator] = useState(false);
  const router = useRouter();

  const handleInvoiceGenerated = (invoiceData: any) => {
    console.log('Invoice generated:', invoiceData);
    // You can add navigation logic here to redirect to the invoice details
    // or refresh the invoices list
  };

  const handleCancel = () => {
    setShowGenerator(false);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Proforma Invoices</h1>
            <p className="text-muted-foreground">
              Generate proforma invoices and payment links for hour package orders
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Generate Invoice
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Invoice
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Help & Requirements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {showGenerator ? (
            <ProformaInvoiceGenerator
              onInvoiceGenerated={handleInvoiceGenerated}
              onCancel={handleCancel}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate New Proforma Invoice
                </CardTitle>
                <CardDescription>
                  Create proforma invoices and payment links for hour package orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <FileText className="h-12 w-12 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Generate Invoice</h3>
                  <p className="text-muted-foreground mb-6">
                    Click the button below to start generating a proforma invoice for hour package orders.
                  </p>
                  <Button
                    onClick={() => setShowGenerator(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Start Generating Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Proforma Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proforma Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Generated this month
                </p>
              </CardContent>
            </Card>

            {/* Payment Links */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Links</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Active payment links
                </p>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground">
                  Invoices paid successfully
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Recent proforma invoice generation activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Generate your first proforma invoice to see activity here.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Requirements
                </CardTitle>
                <CardDescription>
                  Data required for invoice generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Information
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      First Name & Last Name
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Email Address
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      CNP or ID Number (13 digits)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Phone Number
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Address Information
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Street Address
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      City
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Country
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      State/Region (optional)
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company Information (Optional)
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Company Name
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      VAT Code
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Company Address
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Data Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Data Sources
                </CardTitle>
                <CardDescription>
                  Where the system gets user data from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">User Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Basic information entered during registration and profile updates.
                  </p>
                  <Badge variant="outline">Primary Source</Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Veriff Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Identity verification data including ID numbers and personal details.
                  </p>
                  <Badge variant="outline">Most Reliable</Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Smartbill Imports</h4>
                  <p className="text-sm text-muted-foreground">
                    CNP and client data from previously imported invoices.
                  </p>
                  <Badge variant="outline">Historical Data</Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Company Relationships</h4>
                  <p className="text-sm text-muted-foreground">
                    Company information if user is linked to a company account.
                  </p>
                  <Badge variant="outline">Optional</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Types */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Types</CardTitle>
              <CardDescription>
                Understanding the difference between proforma and fiscal invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Proforma Invoice
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Non-fiscal document for preview</li>
                    <li>• No tax obligations</li>
                    <li>• Can be converted to fiscal invoice</li>
                    <li>• Useful for approval processes</li>
                    <li>• No official numbering required</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Fiscal Invoice
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Official tax document</li>
                    <li>• Creates tax obligations</li>
                    <li>• Requires official numbering</li>
                    <li>• Must be reported to tax authorities</li>
                    <li>• Cannot be cancelled easily</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
