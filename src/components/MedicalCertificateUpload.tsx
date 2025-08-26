'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  Award, 
  Calendar, 
  MapPin, 
  User, 
  Languages, 
  Shield, 
  Radio, 
  Signature, 
  Info,
  Plus,
  X,
  Eye,
  Download,
  Trash2,
  Stethoscope
} from 'lucide-react';
import { 
  EASA_COUNTRIES,
  MEDICAL_CLASSES,
  type MedicalCertificate,
  type MedicalCertificateFormData
} from '@/types/pilot-documents';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { toast } from 'sonner';

interface MedicalCertificateUploadProps {
  onCertificateUploaded?: (certificate: MedicalCertificate) => void;
  existingCertificate?: MedicalCertificate;
}

export function MedicalCertificateUpload({ onCertificateUploaded, existingCertificate }: MedicalCertificateUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(existingCertificate ? 2 : 1);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(existingCertificate?.document_id || null);
  const [isViewMode, setIsViewMode] = useState(existingCertificate ? true : false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { formatDate } = useDateFormatUtils();

  // Form state
  const [formData, setFormData] = useState<MedicalCertificateFormData>({
    // File upload
    certificateFile: null as File | null,
    
    // Certificate Details
    licensingAuthority: '',
    medicalClass: '',
    certificateNumber: '',
    validUntil: '',
    
    // Additional Information
    issuedDate: '',
    issuingDoctor: '',
    medicalCenter: '',
    restrictions: '',
    remarks: '',
  });

  // Update form data when existingCertificate changes
  useEffect(() => {
    // Set view mode to true if there's an existing certificate
    if (existingCertificate) {
      setIsViewMode(true);
      setFormData({
        // File upload
        certificateFile: null as File | null,
        
        // Certificate Details
        licensingAuthority: existingCertificate.licensing_authority || '',
        medicalClass: existingCertificate.medical_class || '',
        certificateNumber: existingCertificate.certificate_number || '',
        validUntil: existingCertificate.valid_until ? new Date(existingCertificate.valid_until).toISOString().split('T')[0] : '',
        
        // Additional Information
        issuedDate: existingCertificate.issued_date ? new Date(existingCertificate.issued_date).toISOString().split('T')[0] : '',
        issuingDoctor: existingCertificate.issuing_doctor || '',
        medicalCenter: existingCertificate.medical_center || '',
        restrictions: existingCertificate.restrictions || '',
        remarks: existingCertificate.remarks || '',
      });
    }
  }, [existingCertificate]);

  const handleViewFile = (fileUrl: string, fileName: string, fileType: string) => {
    setSelectedFile({ url: fileUrl, name: fileName, type: fileType });
    setShowFileViewer(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB. Please compress your file or choose a smaller one.');
      return;
    }

    // File type validation
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, JPG, PNG, or WEBP file.');
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('documentType', 'medical_certificate');
      formData.append('file', file);

      const response = await fetch('/api/my-account/pilot-documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('File is too large. Please compress your file or choose a smaller one (max 10MB).');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const { document } = await response.json();
      setUploadedDocumentId(document.id);
      setFormData(prev => ({ ...prev, certificateFile: file }));
      toast.success('Medical certificate file uploaded successfully');
      setCurrentStep(2);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload medical certificate file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!existingCertificate && !uploadedDocumentId) {
      toast.error('Please upload a medical certificate file first');
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const submitFormData = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        // Skip only null/undefined values, but allow empty strings for validation
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            submitFormData.append(key, JSON.stringify(value));
          } else if (typeof value === 'boolean') {
            submitFormData.append(key, String(value));
          } else if (value instanceof File) {
            submitFormData.append(key, value);
          } else {
            submitFormData.append(key, String(value));
          }
        } else if (value === '') {
          // Send empty strings for validation
          submitFormData.append(key, '');
        }
      });
      
      submitFormData.append('documentId', uploadedDocumentId || existingCertificate?.document_id || '');
      
      // Add certificate ID for updates
      if (existingCertificate) {
        submitFormData.append('certificateId', existingCertificate.id);
      }

      const response = await fetch('/api/my-account/medical-certificates', {
        method: existingCertificate ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save medical certificate');
      }

      const { certificate } = await response.json();
      toast.success('Medical certificate saved successfully');
      onCertificateUploaded?.(certificate);
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving medical certificate:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save medical certificate');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      certificateFile: null,
      licensingAuthority: '',
      medicalClass: '',
      certificateNumber: '',
      validUntil: '',
      issuedDate: '',
      issuingDoctor: '',
      medicalCenter: '',
      restrictions: '',
      remarks: '',
    });
    setCurrentStep(1);
    setUploadedDocumentId(null);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (existingCertificate) {
      setIsViewMode(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsViewMode(false);
    setCurrentStep(existingCertificate ? 2 : 1);
    // Clean up any object URLs to prevent memory leaks
    if (formData.certificateFile) {
      URL.revokeObjectURL(URL.createObjectURL(formData.certificateFile));
    }
  };

  const toggleViewMode = () => {
    setIsViewMode(!isViewMode);
    
    // If switching to edit mode and we have existing certificate data, update form data
    if (!isViewMode && existingCertificate) {
      setFormData({
        // File upload
        certificateFile: null as File | null,
        
        // Certificate Details
        licensingAuthority: existingCertificate.licensing_authority || '',
        medicalClass: existingCertificate.medical_class || '',
        certificateNumber: existingCertificate.certificate_number || '',
        validUntil: existingCertificate.valid_until ? new Date(existingCertificate.valid_until).toISOString().split('T')[0] : '',
        
        // Additional Information
        issuedDate: existingCertificate.issued_date ? new Date(existingCertificate.issued_date).toISOString().split('T')[0] : '',
        issuingDoctor: existingCertificate.issuing_doctor || '',
        medicalCenter: existingCertificate.medical_center || '',
        restrictions: existingCertificate.restrictions || '',
        remarks: existingCertificate.remarks || '',
      });
    }
  };

  // Check if the certificate is expired
  const isExpired = existingCertificate && (
    existingCertificate.status === 'expired' || 
    existingCertificate.status === 'archived' || 
    new Date(existingCertificate.valid_until) <= new Date()
  );

  // Memoize the object URL to prevent PDF reloading on form changes
  const memoizedFileUrl = useMemo(() => {
    if (formData.certificateFile) {
      return URL.createObjectURL(formData.certificateFile);
    }
    return null;
  }, [formData.certificateFile]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (memoizedFileUrl) {
        URL.revokeObjectURL(memoizedFileUrl);
      }
    };
  }, [memoizedFileUrl]);
  
  return (
    <>
      <Button variant={existingCertificate ? "outline" : "default"} size="sm" onClick={handleOpen}>
        {existingCertificate ? (
          isExpired ? (
            <>
              <FileText className="h-4 w-4 mr-2" />
              View Archive
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              View/Edit
            </>
          )
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </>
        )}
      </Button>
      
      <Modal
        open={isOpen}
        onClose={handleClose}
        title={`${
          existingCertificate 
            ? (isExpired 
                ? 'View Archived Medical Certificate' 
                : (isViewMode ? 'View Medical Certificate' : 'Edit Medical Certificate')
              ) 
            : 'Upload Medical Certificate'
        }`}
        headerActions={
          existingCertificate && (
            <div className="flex gap-2">
              {isExpired ? (
                <Button variant="default" size="sm" onClick={() => {
                  // Reset to upload new certificate
                  setCurrentStep(1);
                  setIsViewMode(false);
                  resetForm();
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Certificate
                </Button>
              ) : (
                <Button 
                  variant={isViewMode ? "outline" : "default"} 
                  size="sm" 
                  onClick={isViewMode ? toggleViewMode : handleSubmit}
                  disabled={!isViewMode && isUploading}
                >
                  {isViewMode ? 'Edit' : (isUploading ? 'Saving...' : 'Save Changes')}
                </Button>
              )}
            </div>
          )
        }
      >
        <div className="space-y-6">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Step 1: Upload Medical Certificate Document</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Upload a clear scan or photo of your medical certificate
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-4">
                  Supported formats: PDF, JPG, PNG, WEBP (max 10MB)
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  For best results, compress large files before uploading. If you get a "413" error, try reducing the file size.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Split View Mode - Document on left, data on right (for both view and edit) */}
          {(existingCertificate || (currentStep === 2 && uploadedDocumentId)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
              {/* Left Side - Document Viewer */}
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Medical Certificate Document</h3>
                  <div className="ml-auto flex gap-2">
                    {(existingCertificate?.pilot_documents?.[0]?.file_url || (currentStep === 2 && formData.certificateFile)) && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            if (existingCertificate?.pilot_documents?.[0]?.file_url) {
                              handleViewFile(
                                existingCertificate.pilot_documents[0].file_url,
                                existingCertificate.pilot_documents[0].file_name || 'Document',
                                existingCertificate.pilot_documents[0].mime_type || 'application/pdf'
                              );
                            } else if (formData.certificateFile && memoizedFileUrl) {
                              // For newly uploaded files, use the memoized URL
                              handleViewFile(
                                memoizedFileUrl,
                                formData.certificateFile.name,
                                formData.certificateFile.type
                              );
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Full Screen
                        </Button>
                        {existingCertificate?.pilot_documents?.[0]?.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={existingCertificate.pilot_documents[0].file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Document Preview */}
                <div className="flex-1 bg-white rounded-lg border overflow-hidden">
                  {(() => {
                    // For existing certificates, use the stored document
                    if (existingCertificate?.pilot_documents?.[0]?.file_url) {
                      const doc = existingCertificate.pilot_documents[0];
                      if (doc.mime_type?.startsWith('image/')) {
                        return (
                          <img 
                            src={doc.file_url} 
                            alt={doc.file_name || 'Medical Certificate Document'}
                            className="w-full h-full object-contain"
                          />
                        );
                      } else if (doc.mime_type === 'application/pdf') {
                        return (
                          <iframe
                            src={doc.file_url}
                            className="w-full h-full border-0"
                            title={doc.file_name || 'Medical Certificate Document'}
                          />
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-600 mb-4">
                                This file type cannot be previewed directly.
                              </p>
                              <Button asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download to View
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    }
                    // For newly uploaded files, create a preview
                    else if (currentStep === 2 && formData.certificateFile && memoizedFileUrl) {
                      if (formData.certificateFile.type.startsWith('image/')) {
                        return (
                          <img 
                            src={memoizedFileUrl} 
                            alt={formData.certificateFile.name}
                            className="w-full h-full object-contain"
                          />
                        );
                      } else if (formData.certificateFile.type === 'application/pdf') {
                        return (
                          <iframe
                            src={memoizedFileUrl}
                            className="w-full h-full border-0"
                            title={formData.certificateFile.name}
                          />
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-600 mb-4">
                                This file type cannot be previewed directly.
                              </p>
                              <Button onClick={() => {
                                const link = document.createElement('a');
                                link.href = memoizedFileUrl;
                                link.download = formData.certificateFile?.name || 'document';
                                link.click();
                              }}>
                                <Download className="h-4 w-4 mr-2" />
                                Download to View
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    }
                    // No document available
                    else {
                      return (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">No document available</p>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Document Info */}
                <div className="mt-4 bg-white rounded-lg p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-500">File:</span>
                      <p className="text-gray-900 truncate">
                        {existingCertificate?.pilot_documents?.[0]?.file_name || 
                         (formData.certificateFile ? formData.certificateFile.name : 'Document uploaded')}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Size:</span>
                      <p className="text-gray-900">
                        {existingCertificate?.pilot_documents?.[0]?.file_size 
                          ? `${(existingCertificate.pilot_documents[0].file_size / 1024 / 1024).toFixed(2)} MB`
                          : (formData.certificateFile ? `${(formData.certificateFile.size / 1024 / 1024).toFixed(2)} MB` : 'N/A')
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Uploaded:</span>
                      <p className="text-gray-900">
                        {existingCertificate?.pilot_documents?.[0]?.createdAt 
                          ? new Date(existingCertificate.pilot_documents[0].createdAt).toLocaleDateString()
                          : existingCertificate?.pilot_documents?.[0]?.uploaded_at
                            ? new Date(existingCertificate.pilot_documents[0].uploaded_at).toLocaleDateString()
                            : (formData.certificateFile ? 'Just uploaded' : 'N/A')
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Type:</span>
                      <p className="text-gray-900">
                        {existingCertificate?.pilot_documents?.[0]?.document_type || 
                         (formData.certificateFile ? formData.certificateFile.type : 'Medical Certificate')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Certificate Data (Editable) */}
              <div className="bg-gray-50 rounded-lg p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Medical Certificate Information</h3>
                  <Badge variant="outline" className="ml-auto">Editable</Badge>
                </div>
                
                <div className="space-y-4">
                  {/* Certificate Details */}
                  <div className="grid grid-cols-1 gap-3">
                    {/* I. Licensing Authority */}
                    <div>
                      <Label htmlFor="licensingAuthority" className="text-sm font-medium text-gray-500">I. Licensing Authority</Label>
                      {isViewMode ? (
                        <p className="text-gray-900 mt-1">{existingCertificate?.licensing_authority || 'Not specified'}</p>
                      ) : (
                        <Select
                          value={formData.licensingAuthority}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, licensingAuthority: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select EASA country" />
                          </SelectTrigger>
                          <SelectContent>
                            {EASA_COUNTRIES.map((country) => (
                              <SelectItem key={country} value={country}>
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* II. Medical Class */}
                    <div>
                      <Label htmlFor="medicalClass" className="text-sm font-medium text-gray-500">II. Medical Class</Label>
                      {isViewMode ? (
                        <p className="text-gray-900 mt-1">{existingCertificate?.medical_class || 'Not specified'}</p>
                      ) : (
                        <Select
                          value={formData.medicalClass}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, medicalClass: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select medical class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Class 1">Class 1</SelectItem>
                            <SelectItem value="Class 2">Class 2</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* III. Certificate Number */}
                    <div>
                      <Label htmlFor="certificateNumber" className="text-sm font-medium text-gray-500">III. Certificate Number</Label>
                      {isViewMode ? (
                        <p className="text-gray-900 mt-1">{existingCertificate?.certificate_number || 'Not specified'}</p>
                      ) : (
                        <Input
                          id="certificateNumber"
                          value={formData.certificateNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, certificateNumber: e.target.value }))}
                          placeholder="Enter certificate number"
                          className="mt-1"
                          required
                        />
                      )}
                    </div>

                    {/* IX. Valid Until */}
                    <div>
                      <Label htmlFor="validUntil" className="text-sm font-medium text-gray-500">IX. Valid Until</Label>
                      {isViewMode ? (
                        <p className="text-gray-900 mt-1">
                          {existingCertificate?.valid_until 
                            ? new Date(existingCertificate.valid_until).toLocaleDateString()
                            : 'Not specified'
                          }
                        </p>
                      ) : (
                        <Input
                          id="validUntil"
                          type="date"
                          value={formData.validUntil}
                          onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                          className="mt-1"
                          required
                        />
                      )}
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Additional Information</h4>
                      
                      {/* Issued Date */}
                      <div>
                        <Label htmlFor="issuedDate" className="text-sm font-medium text-gray-500">Issued Date</Label>
                        {isViewMode ? (
                          <p className="text-gray-900 mt-1">
                            {existingCertificate?.issued_date 
                              ? new Date(existingCertificate.issued_date).toLocaleDateString()
                              : 'Not specified'
                            }
                          </p>
                        ) : (
                          <Input
                            id="issuedDate"
                            type="date"
                            value={formData.issuedDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, issuedDate: e.target.value }))}
                            className="mt-1"
                          />
                        )}
                      </div>

                      {/* Issuing Doctor */}
                      <div>
                        <Label htmlFor="issuingDoctor" className="text-sm font-medium text-gray-500">Issuing Doctor</Label>
                        {isViewMode ? (
                          <p className="text-gray-900 mt-1">{existingCertificate?.issuing_doctor || 'Not specified'}</p>
                        ) : (
                          <Input
                            id="issuingDoctor"
                            value={formData.issuingDoctor}
                            onChange={(e) => setFormData(prev => ({ ...prev, issuingDoctor: e.target.value }))}
                            placeholder="Enter issuing doctor name"
                            className="mt-1"
                          />
                        )}
                      </div>

                      {/* Medical Center */}
                      <div>
                        <Label htmlFor="medicalCenter" className="text-sm font-medium text-gray-500">Medical Center</Label>
                        {isViewMode ? (
                          <p className="text-gray-900 mt-1">{existingCertificate?.medical_center || 'Not specified'}</p>
                        ) : (
                          <Input
                            id="medicalCenter"
                            value={formData.medicalCenter}
                            onChange={(e) => setFormData(prev => ({ ...prev, medicalCenter: e.target.value }))}
                            placeholder="Enter medical center name"
                            className="mt-1"
                          />
                        )}
                      </div>

                      {/* Restrictions */}
                      <div>
                        <Label htmlFor="restrictions" className="text-sm font-medium text-gray-500">Restrictions</Label>
                        {isViewMode ? (
                          <p className="text-gray-900 mt-1">{existingCertificate?.restrictions || 'None'}</p>
                        ) : (
                          <Textarea
                            id="restrictions"
                            value={formData.restrictions}
                            onChange={(e) => setFormData(prev => ({ ...prev, restrictions: e.target.value }))}
                            placeholder="Enter any restrictions (optional)"
                            className="mt-1"
                            rows={2}
                          />
                        )}
                      </div>

                      {/* Remarks */}
                      <div>
                        <Label htmlFor="remarks" className="text-sm font-medium text-gray-500">Remarks</Label>
                        {isViewMode ? (
                          <p className="text-gray-900 mt-1">{existingCertificate?.remarks || 'None'}</p>
                        ) : (
                          <Textarea
                            id="remarks"
                            value={formData.remarks}
                            onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                            placeholder="Enter any additional remarks (optional)"
                            className="mt-1"
                            rows={2}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save Button - Only show in edit mode for new uploads, not for existing certificates */}
                  {!isViewMode && !existingCertificate && (
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSubmit} disabled={isUploading}>
                        {isUploading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Certificate Details (for new uploads only) */}
          {currentStep === 2 && !isViewMode && !existingCertificate && (
            <div className="space-y-6">
              {/* Certificate Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 gap-3">
                  {/* I. Licensing Authority */}
                  <div>
                    <Label htmlFor="licensingAuthority" className="text-sm font-medium text-gray-500">I. Licensing Authority</Label>
                    <Select
                      value={formData.licensingAuthority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, licensingAuthority: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select EASA country" />
                      </SelectTrigger>
                      <SelectContent>
                        {EASA_COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* II. Medical Class */}
                  <div>
                    <Label htmlFor="medicalClass" className="text-sm font-medium text-gray-500">II. Medical Class</Label>
                    <Select
                      value={formData.medicalClass}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, medicalClass: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select medical class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class 1">Class 1</SelectItem>
                        <SelectItem value="Class 2">Class 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* III. Certificate Number */}
                  <div>
                    <Label htmlFor="certificateNumber" className="text-sm font-medium text-gray-500">III. Certificate Number</Label>
                    <Input
                      id="certificateNumber"
                      value={formData.certificateNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, certificateNumber: e.target.value }))}
                      placeholder="Enter certificate number"
                      className="mt-1"
                      required
                    />
                  </div>

                  {/* IX. Valid Until */}
                  <div>
                    <Label htmlFor="validUntil" className="text-sm font-medium text-gray-500">IX. Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="mt-1"
                      required
                    />
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Additional Information</h4>
                    
                    {/* Issued Date */}
                    <div>
                      <Label htmlFor="issuedDate" className="text-sm font-medium text-gray-500">Issued Date</Label>
                      <Input
                        id="issuedDate"
                        type="date"
                        value={formData.issuedDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, issuedDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    {/* Issuing Doctor */}
                    <div>
                      <Label htmlFor="issuingDoctor" className="text-sm font-medium text-gray-500">Issuing Doctor</Label>
                      <Input
                        id="issuingDoctor"
                        value={formData.issuingDoctor}
                        onChange={(e) => setFormData(prev => ({ ...prev, issuingDoctor: e.target.value }))}
                        placeholder="Enter issuing doctor name"
                        className="mt-1"
                      />
                    </div>

                    {/* Medical Center */}
                    <div>
                      <Label htmlFor="medicalCenter" className="text-sm font-medium text-gray-500">Medical Center</Label>
                      <Input
                        id="medicalCenter"
                        value={formData.medicalCenter}
                        onChange={(e) => setFormData(prev => ({ ...prev, medicalCenter: e.target.value }))}
                        placeholder="Enter medical center name"
                        className="mt-1"
                      />
                    </div>

                    {/* Restrictions */}
                    <div>
                      <Label htmlFor="restrictions" className="text-sm font-medium text-gray-500">Restrictions</Label>
                      <Textarea
                        id="restrictions"
                        value={formData.restrictions}
                        onChange={(e) => setFormData(prev => ({ ...prev, restrictions: e.target.value }))}
                        placeholder="Enter any restrictions (optional)"
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    {/* Remarks */}
                    <div>
                      <Label htmlFor="remarks" className="text-sm font-medium text-gray-500">Remarks</Label>
                      <Textarea
                        id="remarks"
                        value={formData.remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Enter any additional remarks (optional)"
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation - Only for new uploads (step 1 to step 2) */}
          {!existingCertificate && currentStep === 2 && (
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                Back to File Upload
              </Button>
              <div className="flex gap-2 ml-auto">
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading}
                >
                  {isUploading ? 'Saving...' : 'Save Medical Certificate'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* File Viewer Modal */}
      <Modal
        open={showFileViewer}
        onClose={() => setShowFileViewer(false)}
        title={`Viewing: ${selectedFile?.name || 'Document'}`}
      >
        <div className="space-y-4">
          {selectedFile && (
            <div className="bg-white rounded-lg border">
              {selectedFile.type.startsWith('image/') ? (
                <img 
                  src={selectedFile.url} 
                  alt={selectedFile.name}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : selectedFile.type === 'application/pdf' ? (
                <iframe
                  src={selectedFile.url}
                  className="w-full h-[70vh] border-0"
                  title={selectedFile.name}
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    This file type cannot be previewed directly.
                  </p>
                  <Button asChild>
                    <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFileViewer(false)}>
              Close
            </Button>
            {selectedFile && (
              <Button asChild>
                <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
