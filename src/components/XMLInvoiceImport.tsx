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
import { Modal } from '@/components/ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download,
  Eye,
  Loader2,
  Edit,
  Save
} from 'lucide-react';
import { XMLInvoiceParser, type XMLInvoice } from '@/lib/xml-invoice-parser';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface XMLInvoiceImportProps {
  className?: string;
  onImportSuccess?: (invoice: XMLInvoice) => void;
}

export default function XMLInvoiceImport({ className, onImportSuccess }: XMLInvoiceImportProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState<File | null>(null);
  const [xmlContent, setXmlContent] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<XMLInvoice | null>(null);
  const [originalInvoice, setOriginalInvoice] = useState<XMLInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<XMLInvoice | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
      setOriginalInvoice(JSON.parse(JSON.stringify(invoice))); // Keep original for comparison
      setEditingInvoice(JSON.parse(JSON.stringify(invoice))); // Deep copy for editing
      setValidationErrors([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse XML');
    }
  };

  const handlePreview = () => {
    if (previewInvoice) {
      setIsPreviewModalOpen(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsPreviewModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingInvoice) {
      setPreviewInvoice(editingInvoice); // Update preview to show current state
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    if (previewInvoice) {
      setEditingInvoice(JSON.parse(JSON.stringify(previewInvoice))); // Reset to original
    }
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: any) => {
    if (!editingInvoice) return;
    
    setEditingInvoice(prev => {
      if (!prev) return prev;
      
      if (field.startsWith('client.')) {
        const clientField = field.replace('client.', '');
        return {
          ...prev,
          client: {
            ...prev.client,
            [clientField]: value
          }
        };
      } else if (field.startsWith('items.')) {
        const [itemIndex, itemField] = field.replace('items.', '').split('.');
        const index = parseInt(itemIndex);
        return {
          ...prev,
          items: prev.items.map((item, i) => 
            i === index ? { ...item, [itemField]: value } : item
          )
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };

  const handleAddItem = () => {
    if (!editingInvoice) return;
    
    const newItem = {
      name: 'New Item',
      description: '',
      quantity: 1,
      unit: 'HUR',
      price: 0,
      total: 0,
      vatRate: 19
    };
    
    setEditingInvoice(prev => ({
      ...prev!,
      items: [...prev!.items, newItem]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (!editingInvoice) return;
    
    setEditingInvoice(prev => ({
      ...prev!,
      items: prev!.items.filter((_, i) => i !== index)
    }));
  };

  const handleImport = async () => {
    const invoiceToImport = editingInvoice || previewInvoice;
    if (!invoiceToImport) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      
      // Send both original XML and edited invoice data
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('xmlContent', xmlContent);
      }
      
            // Add edited invoice data
      formData.append('editedInvoice', JSON.stringify(invoiceToImport));
      
      // Check if there are actual edits by comparing with the original invoice
      const hasActualEdits = originalInvoice && JSON.stringify(invoiceToImport) !== JSON.stringify(originalInvoice);
      formData.append('hasEdits', hasActualEdits.toString());
      




      const response = await fetch('/api/smartbill/import-xml', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          setSuccess(data.message || 'Invoice imported successfully!');
          setFile(null);
          setXmlContent('');
          setPreviewInvoice(null);
          setEditingInvoice(null);
          setIsPreviewModalOpen(false);
          setIsEditing(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onImportSuccess?.(invoiceToImport);
          
          // Show success toast
          toast.success('Invoice imported successfully!', {
            description: `Invoice ${invoiceToImport.id} has been imported.`,
          });
        } else {
          const errorMessage = data.error || 'Import failed';
          const stepInfo = data.step ? ` (Step: ${data.step})` : '';
          setError(`${errorMessage}${stepInfo}`);
          
          // Show error toast with step information
          toast.error('Import failed', {
            description: `${errorMessage}${stepInfo}`,
          });
        }
      } else {
        const errorMessage = data.error || 'Import failed';
        setError(errorMessage);
        
        // Show error toast
        toast.error('Import failed', {
          description: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage = 'Failed to import invoice';
      setError(errorMessage);
      
      // Show error toast
      toast.error('Import failed', {
        description: errorMessage,
      });
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

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-2">
                  <Button 
                    onClick={handlePreview}
                    variant="outline"
                    className="min-w-[120px]"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview & Edit
                  </Button>
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

      {/* Preview & Edit Modal */}
      <Modal
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={`Invoice Preview - ${(editingInvoice || previewInvoice)?.id}`}
        headerActions={
          isEditing ? (
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveEdit}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                variant="outline"
                onClick={handleCancelEdit}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={handleEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )
        }
      >
        {(editingInvoice || previewInvoice) && (
          <div className="space-y-8">
            {/* Invoice Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Invoice Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.id}
                      onChange={(e) => handleFieldChange('id', e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium text-card-foreground">{(editingInvoice || previewInvoice)?.id}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Series</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.series || ''}
                      onChange={(e) => handleFieldChange('series', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.series}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      type="date"
                      value={editingInvoice.date}
                      onChange={(e) => handleFieldChange('date', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{formatDate((editingInvoice || previewInvoice)?.date || '')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      type="date"
                      value={editingInvoice.dueDate}
                      onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{formatDate((editingInvoice || previewInvoice)?.dueDate || '')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  {isEditing && editingInvoice ? (
                    <Select value={editingInvoice.status} onValueChange={(value) => handleFieldChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.status}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editingInvoice.total}
                      onChange={(e) => handleFieldChange('total', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-base font-medium text-green-600">
                      {formatCurrency((editingInvoice || previewInvoice)?.total || 0, (editingInvoice || previewInvoice)?.currency || 'RON')}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">VAT Amount</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editingInvoice.vatTotal}
                      onChange={(e) => handleFieldChange('vatTotal', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{formatCurrency((editingInvoice || previewInvoice)?.vatTotal || 0, (editingInvoice || previewInvoice)?.currency || 'RON')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.currency}
                      onChange={(e) => handleFieldChange('currency', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.currency}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Client Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.client.name}
                      onChange={(e) => handleFieldChange('client.name', e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium text-card-foreground">{(editingInvoice || previewInvoice)?.client.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.client.email || ''}
                      onChange={(e) => handleFieldChange('client.email', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.client.email || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.client.phone || ''}
                      onChange={(e) => handleFieldChange('client.phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.client.phone || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">VAT Code</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.client.vatCode || ''}
                      onChange={(e) => handleFieldChange('client.vatCode', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.client.vatCode || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.client.address || ''}
                      onChange={(e) => handleFieldChange('client.address', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.client.address || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">City</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.client.city || ''}
                      onChange={(e) => handleFieldChange('client.city', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.client.city || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                  {isEditing && editingInvoice ? (
                    <Input
                      value={editingInvoice.client.country || ''}
                      onChange={(e) => handleFieldChange('client.country', e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{(editingInvoice || previewInvoice)?.client.country || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="bg-muted rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-card-foreground flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Items ({((editingInvoice || previewInvoice)?.items?.length || 0)} items)
                </h3>
                {isEditing && editingInvoice && (
                  <Button 
                    onClick={handleAddItem}
                    variant="outline"
                    size="sm"
                  >
                    Add Item
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {(editingInvoice || previewInvoice)?.items?.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Item #{index + 1}</Badge>
                        <Badge variant="secondary" className="text-xs">{item.unit}</Badge>
                      </div>
                      {isEditing && editingInvoice && (
                        <Button 
                          onClick={() => handleRemoveItem(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Item Name</Label>
                        {isEditing && editingInvoice ? (
                          <Input
                            value={item.name}
                            onChange={(e) => handleFieldChange(`items.${index}.name`, e.target.value)}
                          />
                        ) : (
                          <p className="text-base font-medium text-card-foreground">{item.name}</p>
                        )}
                        {item.description && (
                          <div className="mt-2">
                            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                            {isEditing && editingInvoice ? (
                              <Input
                                value={item.description || ''}
                                onChange={(e) => handleFieldChange(`items.${index}.description`, e.target.value)}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                        {isEditing && editingInvoice ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleFieldChange(`items.${index}.quantity`, parseFloat(e.target.value) || 0)}
                          />
                        ) : (
                          <p className="text-base text-card-foreground">{item.quantity}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Unit</Label>
                        {isEditing && editingInvoice ? (
                          <Input
                            value={item.unit}
                            onChange={(e) => handleFieldChange(`items.${index}.unit`, e.target.value)}
                          />
                        ) : (
                          <p className="text-base text-card-foreground">{item.unit}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Price</Label>
                        {isEditing && editingInvoice ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => handleFieldChange(`items.${index}.price`, parseFloat(e.target.value) || 0)}
                          />
                        ) : (
                          <p className="text-base text-card-foreground">{formatCurrency(item.price, (editingInvoice || previewInvoice)?.currency || 'RON')}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Total</Label>
                        {isEditing && editingInvoice ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.total}
                            onChange={(e) => handleFieldChange(`items.${index}.total`, parseFloat(e.target.value) || 0)}
                          />
                        ) : (
                          <p className="text-base font-medium text-card-foreground">{formatCurrency(item.total, (editingInvoice || previewInvoice)?.currency || 'RON')}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">VAT Rate (%)</Label>
                        {isEditing && editingInvoice ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.vatRate || 19}
                            onChange={(e) => handleFieldChange(`items.${index}.vatRate`, parseFloat(e.target.value) || 19)}
                          />
                        ) : (
                          <p className="text-base text-card-foreground">{item.vatRate || 19}%</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Debug info for each item */}
                    {!isEditing && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Debug Info (Item #{index + 1})
                          </summary>
                          <div className="mt-2 space-y-1 text-muted-foreground">
                            <div><strong>Unit:</strong> {item.unit}</div>
                            <div><strong>Name:</strong> {item.name}</div>
                            <div><strong>Description:</strong> {item.description || 'N/A'}</div>
                            <div><strong>Quantity:</strong> {item.quantity}</div>
                            <div><strong>Price:</strong> {item.price}</div>
                            <div><strong>Total:</strong> {item.total}</div>
                            <div><strong>VAT Rate:</strong> {item.vatRate || 19}%</div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw XML Content (for debugging) */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Raw XML Content (Debug)
              </h3>
              <div className="bg-background border rounded-lg p-4">
                <pre className="text-xs text-muted-foreground overflow-auto max-h-40">
                  {xmlContent.substring(0, 1000)}...
                </pre>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Total items found:</strong> {(editingInvoice || previewInvoice)?.items?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Items with H87:</strong> {(editingInvoice || previewInvoice)?.items?.filter(item => item.unit === 'H87').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Items with HUR:</strong> {(editingInvoice || previewInvoice)?.items?.filter(item => item.unit === 'HUR').length || 0}
                </p>
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-end">
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
          </div>
        )}
      </Modal>
    </div>
  );
} 