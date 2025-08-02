'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { XMLInvoiceParser, type XMLInvoice } from '@/lib/xml-invoice-parser';
import { format } from 'date-fns';

interface XMLInvoiceImportProps {
  className?: string;
  onImportSuccess?: (invoice: XMLInvoice) => void;
}

export default function XMLInvoiceImport({ className, onImportSuccess }: XMLInvoiceImportProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState<File | null>(null);
  const [xmlContent, setXmlContent] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<XMLInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xml')) {
        setError('Please select an XML file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      setValidationErrors([]);
      setPreviewInvoice(null);
      processFile(selectedFile);
    }
  };

  const handleXMLContentChange = (content: string) => {
    setXmlContent(content);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);
    setPreviewInvoice(null);
  };

  const handleParseXML = async () => {
    if (!xmlContent.trim()) {
      setError('Please enter XML content first');
      return;
    }
    await processXMLContent(xmlContent);
  };

  const processFile = async (file: File) => {
    try {
      const content = await file.text();
      processXMLContent(content);
    } catch (err) {
      setError('Failed to read file');
    }
  };

  const processXMLContent = async (content: string) => {
    try {
      // Validate XML
      const validation = XMLInvoiceParser.validateXMLInvoice(content);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      // Parse and preview
      const invoice = await XMLInvoiceParser.parseXMLInvoice(content);
      setPreviewInvoice(invoice);
      setValidationErrors([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse XML');
    }
  };

  const handleImport = async () => {
    if (!previewInvoice) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('xmlContent', xmlContent);
      }

      const response = await fetch('/api/smartbill/import-xml', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setFile(null);
        setXmlContent('');
        setPreviewInvoice(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onImportSuccess?.(previewInvoice);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      setError('Failed to import invoice');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleXML = () => {
    const sample = XMLInvoiceParser.generateSampleXML();
    setXmlContent(sample);
    setActiveTab('manual');
    processXMLContent(sample);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import XML Invoice
          </CardTitle>
          <CardDescription>
            Import SmartBill XML invoices manually until the API is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Sample XML Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={loadSampleXML} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Load Sample XML
            </Button>
          </div>

          {/* Import Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">File Upload</TabsTrigger>
              <TabsTrigger value="manual">Manual Input</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Select XML File</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    accept=".xml"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-background border border-input hover:bg-accent hover:text-accent-foreground"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  {file && (
                    <span className="text-sm text-muted-foreground">
                      {file.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a SmartBill XML invoice file
                </p>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="xml-content">XML Content</Label>
                <Textarea
                  id="xml-content"
                  placeholder="Paste your XML invoice content here..."
                  value={xmlContent}
                  onChange={(e) => handleXMLContentChange(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Paste the XML content directly from your SmartBill export
                </p>
              </div>
              
              {/* Parse XML Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleParseXML} 
                  disabled={!xmlContent.trim()}
                  className="min-w-[120px]"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Parse XML
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">XML Validation Errors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Invoice Preview */}
          {previewInvoice && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Invoice Preview
                </CardTitle>
                <CardDescription>
                  Review the invoice before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Invoice Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Invoice Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Number:</span>
                        <span className="font-medium">
                          {previewInvoice.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{formatDate(previewInvoice.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span>{formatDate(previewInvoice.dueDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">
                          {formatCurrency(previewInvoice.total, previewInvoice.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT:</span>
                        <span>{formatCurrency(previewInvoice.vatTotal, previewInvoice.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Client Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{previewInvoice.client.name}</p>
                      </div>
                      {previewInvoice.client.vatCode && (
                        <div>
                          <span className="text-muted-foreground">VAT Code:</span>
                          <p>{previewInvoice.client.vatCode}</p>
                        </div>
                      )}
                      {previewInvoice.client.address && (
                        <div>
                          <span className="text-muted-foreground">Address:</span>
                          <p>{previewInvoice.client.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Invoice Items</h4>
                  <div className="space-y-3">
                    {previewInvoice.items.map((item, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-base">{item.name}</p>
                            {item.description && item.description !== item.name && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </div>
                          <span className="font-medium text-base">
                            {formatCurrency(item.total, previewInvoice.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>
                            {item.quantity} {item.unit} × {formatCurrency(item.price, previewInvoice.currency)}
                          </span>
                          <span>VAT: {item.vatRate || 19}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Import Button */}
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleImport} 
                    disabled={loading}
                    className="min-w-[120px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Import Invoice
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 