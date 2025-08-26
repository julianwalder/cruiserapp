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
  Trash2
} from 'lucide-react';
import { 
  LICENSE_TYPES, 
  MEDICAL_CLASSES, 
  LANGUAGE_LEVELS, 
  AVIATION_LANGUAGES,
  EASA_COUNTRIES,
  type PilotLicense,
  type ClassTypeRating,
  type LanguageProficiency,
  type ExaminerSignature
} from '@/types/pilot-documents';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { toast } from 'sonner';

// Helper function to convert Date to ISO date string
const dateToISOString = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

interface PilotLicenseUploadProps {
  onLicenseUploaded?: (license: PilotLicense) => void;
  existingLicense?: PilotLicense;
}

export function PilotLicenseUpload({ onLicenseUploaded, existingLicense }: PilotLicenseUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(existingLicense ? 2 : 1);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(existingLicense?.document_id || null);
  const [isViewMode, setIsViewMode] = useState(existingLicense ? true : false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { formatDate } = useDateFormatUtils();

  // Form state
  const [formData, setFormData] = useState({
    // File upload
    licenseFile: null as File | null,
    
    // Essential License Fields
    stateOfIssue: '',
    licenseNumber: '',
    licenseType: '',
    dateOfIssue: '',
    countryCodeOfInitialIssue: '',
    
    // Ratings & Language Proficiency
    classTypeRatings: [] as ClassTypeRating[],
    languageProficiency: [] as LanguageProficiency[],
  });

  // Update form data when existingLicense changes
  useEffect(() => {
    console.log('useEffect triggered. existingLicense:', existingLicense);
    console.log('existingLicense.pilot_documents:', existingLicense?.pilot_documents);
    
        // Set view mode to true if there's an existing license
    if (existingLicense) {
      setIsViewMode(true);
      setFormData({
        // File upload
        licenseFile: null as File | null,
        
        // Essential License Fields
        stateOfIssue: existingLicense.state_of_issue || '',
        licenseNumber: existingLicense.license_number || '',
        licenseType: existingLicense.license_type || '',
        dateOfIssue: existingLicense.date_of_issue ? new Date(existingLicense.date_of_issue).toISOString().split('T')[0] : '',
        countryCodeOfInitialIssue: existingLicense.country_code_of_initial_issue || '',
        
        // Ratings & Language Proficiency
        classTypeRatings: existingLicense.class_type_ratings || [] as ClassTypeRating[],
        languageProficiency: existingLicense.language_proficiency || [] as LanguageProficiency[],
      });
    }
  }, [existingLicense]);

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
      formData.append('documentType', 'pilot_license');
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
      setFormData(prev => ({ ...prev, licenseFile: file }));
      toast.success('License file uploaded successfully');
      setCurrentStep(2);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload license file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!existingLicense && !uploadedDocumentId) {
      toast.error('Please upload a license file first');
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const submitFormData = new FormData();
      
      // Debug: Log current form state
      console.log('Current form state:', formData);
      console.log('Existing license:', existingLicense);
      console.log('Is view mode:', isViewMode);
      
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
      
              submitFormData.append('documentId', uploadedDocumentId || existingLicense?.document_id || '');
      
      // Add license ID for updates
      if (existingLicense) {
        submitFormData.append('licenseId', existingLicense.id);
      }

      // Debug: Log what's being sent
      console.log('Form data being sent:');
      for (const [key, value] of submitFormData.entries()) {
        console.log(`${key}:`, value);
      }

      const response = await fetch('/api/my-account/pilot-licenses', {
        method: existingLicense ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save license');
      }

      const { license } = await response.json();
      toast.success('Pilot license saved successfully');
      onLicenseUploaded?.(license);
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving license:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save license');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      licenseFile: null,
      stateOfIssue: '',
      licenseNumber: '',
      licenseType: '',
      dateOfIssue: '',
      countryCodeOfInitialIssue: '',
      classTypeRatings: [],
      languageProficiency: [],
    });
    setCurrentStep(1);
    setUploadedDocumentId(null);
  };

  const addClassTypeRating = () => {
    setFormData(prev => ({
      ...prev,
      classTypeRatings: [...prev.classTypeRatings, { rating: '', validUntil: new Date(), remarks: '' }]
    }));
  };

  const removeClassTypeRating = (index: number) => {
    setFormData(prev => ({
      ...prev,
      classTypeRatings: prev.classTypeRatings.filter((_, i) => i !== index)
    }));
  };

  const updateClassTypeRating = (index: number, field: keyof ClassTypeRating, value: any) => {
    setFormData(prev => ({
      ...prev,
      classTypeRatings: prev.classTypeRatings.map((rating, i) => 
        i === index ? { ...rating, [field]: value } : rating
      )
    }));
  };

  const addLanguageProficiency = () => {
    setFormData(prev => ({
      ...prev,
      languageProficiency: [...prev.languageProficiency, { language: '', level: '', validityExpiry: new Date() }]
    }));
  };

  const removeLanguageProficiency = (index: number) => {
    setFormData(prev => ({
      ...prev,
      languageProficiency: prev.languageProficiency.filter((_, i) => i !== index)
    }));
  };

  const updateLanguageProficiency = (index: number, field: keyof LanguageProficiency, value: any) => {
    setFormData(prev => ({
      ...prev,
      languageProficiency: prev.languageProficiency.map((lang, i) => 
        i === index ? { ...lang, [field]: value } : lang
      )
    }));
  };



  const handleOpen = () => {
    setIsOpen(true);
    if (existingLicense) {
      setIsViewMode(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsViewMode(false);
    setCurrentStep(existingLicense ? 2 : 1);
    // Clean up any object URLs to prevent memory leaks
    if (formData.licenseFile) {
      URL.revokeObjectURL(URL.createObjectURL(formData.licenseFile));
    }
  };

  const toggleViewMode = () => {
    console.log('Toggling view mode. Current isViewMode:', isViewMode);
    console.log('Existing license data:', existingLicense);
    
    setIsViewMode(!isViewMode);
    
    // If switching to edit mode and we have existing license data, update form data
    if (!isViewMode && existingLicense) {
      setFormData({
        // File upload
        licenseFile: null as File | null,
        
        // Essential License Fields
        stateOfIssue: existingLicense.state_of_issue || '',
        licenseNumber: existingLicense.license_number || '',
        licenseType: existingLicense.license_type || '',
        dateOfIssue: existingLicense.date_of_issue ? new Date(existingLicense.date_of_issue).toISOString().split('T')[0] : '',
        countryCodeOfInitialIssue: existingLicense.country_code_of_initial_issue || '',
        
        // Ratings & Language Proficiency
        classTypeRatings: existingLicense.class_type_ratings || [] as ClassTypeRating[],
        languageProficiency: existingLicense.language_proficiency || [] as LanguageProficiency[],
      });
    }
  };

  // Check if the license is expired
  const isExpired = existingLicense && (existingLicense.status === 'expired' || existingLicense.status === 'archived');

  // Memoize the object URL to prevent PDF reloading on form changes
  const memoizedFileUrl = useMemo(() => {
    if (formData.licenseFile) {
      return URL.createObjectURL(formData.licenseFile);
    }
    return null;
  }, [formData.licenseFile]);

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
      <Button variant={existingLicense ? "outline" : "default"} size="sm" onClick={handleOpen}>
        {existingLicense ? (
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
          existingLicense 
            ? (isExpired 
                ? 'View Archived License' 
                : (isViewMode ? 'View Pilot License' : 'Edit Pilot License')
              ) 
            : 'Upload Pilot License'
        }`}
        headerActions={
          existingLicense && (
            <div className="flex gap-2">
              {isExpired ? (
                <Button variant="default" size="sm" onClick={() => {
                  // Reset to upload new license
                  setCurrentStep(1);
                  setIsViewMode(false);
                  resetForm();
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New License
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={toggleViewMode}>
                  {isViewMode ? 'Edit' : 'View'}
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
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Step 1: Upload License Document</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Upload a clear scan or photo of your pilot license
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
          {(existingLicense || (currentStep === 2 && uploadedDocumentId)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
              {/* Left Side - Document Viewer */}
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">License Document</h3>
                  <div className="ml-auto flex gap-2">
                    {(existingLicense?.pilot_documents?.[0]?.file_url || (currentStep === 2 && formData.licenseFile)) && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            if (existingLicense?.pilot_documents?.[0]?.file_url) {
                              handleViewFile(
                                existingLicense.pilot_documents[0].file_url,
                                existingLicense.pilot_documents[0].file_name || 'Document',
                                existingLicense.pilot_documents[0].mime_type || 'application/pdf'
                              );
                            } else if (formData.licenseFile && memoizedFileUrl) {
                              // For newly uploaded files, use the memoized URL
                              handleViewFile(
                                memoizedFileUrl,
                                formData.licenseFile.name,
                                formData.licenseFile.type
                              );
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Full Screen
                        </Button>
                        {existingLicense?.pilot_documents?.[0]?.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={existingLicense.pilot_documents[0].file_url} target="_blank" rel="noopener noreferrer">
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
                    // For existing licenses, use the stored document
                    if (existingLicense?.pilot_documents?.[0]?.file_url) {
                      const doc = existingLicense.pilot_documents[0];
                      if (doc.mime_type?.startsWith('image/')) {
                        return (
                          <img 
                            src={doc.file_url} 
                            alt={doc.file_name || 'License Document'}
                            className="w-full h-full object-contain"
                          />
                        );
                      } else if (doc.mime_type === 'application/pdf') {
                        return (
                          <iframe
                            src={doc.file_url}
                            className="w-full h-full border-0"
                            title={doc.file_name || 'License Document'}
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
                    else if (currentStep === 2 && formData.licenseFile && memoizedFileUrl) {
                      if (formData.licenseFile.type.startsWith('image/')) {
                        return (
                          <img 
                            src={memoizedFileUrl} 
                            alt={formData.licenseFile.name}
                            className="w-full h-full object-contain"
                          />
                        );
                      } else if (formData.licenseFile.type === 'application/pdf') {
                        return (
                          <iframe
                            src={memoizedFileUrl}
                            className="w-full h-full border-0"
                            title={formData.licenseFile.name}
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
                                link.download = formData.licenseFile?.name || 'document';
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
                        {existingLicense?.pilot_documents?.[0]?.file_name || 
                         (formData.licenseFile ? formData.licenseFile.name : 'Document uploaded')}
                      </p>
                      </div>
                      <div>
                      <span className="font-medium text-gray-500">Size:</span>
                        <p className="text-gray-900">
                        {existingLicense?.pilot_documents?.[0]?.file_size 
                          ? `${(existingLicense.pilot_documents[0].file_size / 1024 / 1024).toFixed(2)} MB`
                          : (formData.licenseFile ? `${(formData.licenseFile.size / 1024 / 1024).toFixed(2)} MB` : 'N/A')
                          }
                        </p>
                      </div>
                      <div>
                      <span className="font-medium text-gray-500">Uploaded:</span>
                        <p className="text-gray-900">
                    {existingLicense?.pilot_documents?.[0]?.createdAt 
                          ? new Date(existingLicense.pilot_documents[0].createdAt).toLocaleDateString()
                      : existingLicense?.pilot_documents?.[0]?.uploaded_at
                          ? new Date(existingLicense.pilot_documents[0].uploaded_at).toLocaleDateString()
                      : (formData.licenseFile ? 'Just uploaded' : 'N/A')
                          }
                        </p>
                      </div>
                      <div>
                      <span className="font-medium text-gray-500">Type:</span>
                      <p className="text-gray-900">
                    {existingLicense?.pilot_documents?.[0]?.document_type || 
                     (formData.licenseFile ? formData.licenseFile.type : 'Pilot License')}
                      </p>
                      </div>
                    </div>
                </div>
              </div>

              {/* Right Side - License Data (Editable) */}
              <div className="bg-gray-50 rounded-lg p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">License Information</h3>
                  <Badge variant="outline" className="ml-auto">Editable</Badge>
                </div>
                
                <div className="space-y-4">
                  {/* Essential License Fields */}
                  <div className="grid grid-cols-1 gap-3">
                      {/* I. State of issue */}
                      <div>
                        <Label htmlFor="stateOfIssue" className="text-sm font-medium text-gray-500">I. State of issue</Label>
                        {isViewMode ? (
                          <p className="text-gray-900 mt-1">{existingLicense?.state_of_issue || 'Not specified'}</p>
                        ) : (
                        <Select
                          value={formData.stateOfIssue}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, stateOfIssue: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select issuing state" />
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

                      {/* III. License number */}
                      <div>
                        <Label htmlFor="licenseNumber" className="text-sm font-medium text-gray-500">III. License number</Label>
                        {isViewMode ? (
                          <p className="text-gray-900 mt-1">{existingLicense?.license_number || 'Not specified'}</p>
                        ) : (
                        <Input
                          id="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                          placeholder="e.g., RO-123456"
                            className="mt-1"
                          required
                        />
                        )}
                      </div>

                      {/* II. Titles of licenses with Date of issue and Country Code */}
                      <div className="grid grid-cols-3 gap-3">
                      <div>
                          <Label htmlFor="licenseType" className="text-sm font-medium text-gray-500">II. Titles of licenses</Label>
                          {isViewMode ? (
                            <p className="text-gray-900 mt-1">{existingLicense?.license_type || 'Not specified'}</p>
                          ) : (
                        <Select
                          value={formData.licenseType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, licenseType: value }))}
                        >
                              <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select license type" />
                          </SelectTrigger>
                          <SelectContent>
                                <SelectItem value="PPL(A)">PPL(A)</SelectItem>
                                <SelectItem value="CPL(A)">CPL(A)</SelectItem>
                                <SelectItem value="ATPL(A)">ATPL(A)</SelectItem>
                          </SelectContent>
                        </Select>
                          )}
                      </div>

                      <div>
                          <Label htmlFor="dateOfIssue" className="text-sm font-medium text-gray-500">Date of issue</Label>
                          {isViewMode ? (
                            <p className="text-gray-900 mt-1">
                              {existingLicense?.date_of_issue 
                                ? new Date(existingLicense.date_of_issue).toLocaleDateString()
                                : 'Not specified'
                              }
                            </p>
                          ) : (
                        <Input
                              id="dateOfIssue"
                          type="date"
                              value={formData.dateOfIssue}
                              onChange={(e) => setFormData(prev => ({ ...prev, dateOfIssue: e.target.value }))}
                              className="mt-1"
                          required
                        />
                          )}
                      </div>

                      <div>
                          <Label htmlFor="countryCodeOfInitialIssue" className="text-sm font-medium text-gray-500">Country Code</Label>
                          {isViewMode ? (
                            <p className="text-gray-900 mt-1">{existingLicense?.country_code_of_initial_issue || 'Not specified'}</p>
                          ) : (
                        <Input
                          id="countryCodeOfInitialIssue"
                          value={formData.countryCodeOfInitialIssue}
                          onChange={(e) => setFormData(prev => ({ ...prev, countryCodeOfInitialIssue: e.target.value }))}
                          placeholder="e.g., RO"
                              className="mt-1"
                          required
                              maxLength={2}
                        />
                          )}
                      </div>
                      </div>

                                              {/* XII. Ratings with multiple ratings support */}
                      <div>
                          <Label className="text-sm font-medium text-gray-500">XII. Ratings</Label>
                          {isViewMode ? (
                            <div className="mt-1 space-y-2">
                              {existingLicense?.class_type_ratings && existingLicense.class_type_ratings.length > 0 ? (
                                existingLicense.class_type_ratings.map((rating, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{rating.rating}</span>
                                    <span className="text-gray-500">-</span>
                                    <span>Valid until: {new Date(rating.validUntil).toLocaleDateString()}</span>
                      </div>
                                ))
                              ) : (
                                <p className="text-gray-900">Not specified</p>
                  )}
                </div>
                          ) : (
                            <div className="mt-1 space-y-3">
                  {formData.classTypeRatings.map((rating, index) => (
                                <div key={index} className="grid grid-cols-2 gap-3">
                                  <Select
                                    value={rating.rating}
                                    onValueChange={(value) => {
                                      const updatedRatings = [...formData.classTypeRatings];
                                      updatedRatings[index] = { ...rating, rating: value };
                                      setFormData(prev => ({
                                        ...prev,
                                        classTypeRatings: updatedRatings
                                      }));
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="SEP(land)">SEP(land)</SelectItem>
                                      <SelectItem value="FI(A)-SEP(land)">FI(A)-SEP(land)</SelectItem>
                                    </SelectContent>
                                  </Select>
                          <Input
                            type="date"
                                    value={rating.validUntil ? new Date(rating.validUntil).toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                      const updatedRatings = [...formData.classTypeRatings];
                                      updatedRatings[index] = { ...rating, validUntil: new Date(e.target.value) };
                                      setFormData(prev => ({
                                        ...prev,
                                        classTypeRatings: updatedRatings
                                      }));
                                    }}
                                    placeholder="Valid until"
                                  />
                    </div>
                  ))}
                        <Button
                          type="button"
                                variant="outline"
                          size="sm"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    classTypeRatings: [...prev.classTypeRatings, { rating: '', validUntil: new Date(), remarks: '' }]
                                  }));
                                }}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Rating
                        </Button>
                      </div>
                          )}
                        </div>

                        {/* XIII. Remarks: Language Proficiency */}
                        <div>
                          <Label className="text-sm font-medium text-gray-500">XIII. Remarks: Language Proficiency</Label>
                          {isViewMode ? (
                            <div className="mt-1 space-y-2">
                              {existingLicense?.language_proficiency && existingLicense.language_proficiency.length > 0 ? (
                                existingLicense.language_proficiency.map((lang, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{lang.language}</span>
                                    <span className="text-gray-500">-</span>
                                    <span>Level {lang.level}</span>
                                    {lang.level !== 'VI' && (
                                      <>
                                        <span className="text-gray-500">-</span>
                                        <span>Valid until: {lang.validityExpiry ? new Date(lang.validityExpiry).toLocaleDateString() : 'N/A'}</span>
                                      </>
                                    )}
                                    {lang.level === 'VI' && (
                                      <span className="text-green-600 font-medium">(Valid for life)</span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-900">Not specified</p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-1 space-y-3">
                                                             {formData.languageProficiency.map((lang, index) => (
                                 <div key={index} className="grid grid-cols-3 gap-3">
                          <Select
                            value={lang.language}
                                     onValueChange={(value) => {
                                       const updatedLanguages = [...formData.languageProficiency];
                                       updatedLanguages[index] = { ...lang, language: value };
                                       setFormData(prev => ({
                                         ...prev,
                                         languageProficiency: updatedLanguages
                                       }));
                                     }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                       <SelectItem value="English">English</SelectItem>
                                       <SelectItem value="Romanian">Romanian</SelectItem>
                                       <SelectItem value="French">French</SelectItem>
                                       <SelectItem value="German">German</SelectItem>
                                       <SelectItem value="Spanish">Spanish</SelectItem>
                                       <SelectItem value="Italian">Italian</SelectItem>
                                       <SelectItem value="Portuguese">Portuguese</SelectItem>
                                       <SelectItem value="Russian">Russian</SelectItem>
                                       <SelectItem value="Arabic">Arabic</SelectItem>
                                       <SelectItem value="Chinese">Chinese</SelectItem>
                                       <SelectItem value="Japanese">Japanese</SelectItem>
                                       <SelectItem value="Korean">Korean</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={lang.level}
                                    onValueChange={(value) => {
                                      const updatedLanguages = [...formData.languageProficiency];
                                      updatedLanguages[index] = { 
                                        ...lang, 
                                        level: value,
                                        // Clear validity date if level VI (valid for life)
                                        validityExpiry: value === 'VI' ? null : lang.validityExpiry
                                      };
                                      setFormData(prev => ({
                                        ...prev,
                                        languageProficiency: updatedLanguages
                                      }));
                                    }}
                          >
                            <SelectTrigger>
                                      <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                                       <SelectItem value="IV">Level IV</SelectItem>
                                       <SelectItem value="V">Level V</SelectItem>
                                       <SelectItem value="VI">Level VI (Valid for life)</SelectItem>
                            </SelectContent>
                          </Select>
                                  {lang.level !== 'VI' ? (
                          <Input
                            type="date"
                                      value={lang.validityExpiry ? new Date(lang.validityExpiry).toISOString().split('T')[0] : ''}
                                      onChange={(e) => {
                                        const updatedLanguages = [...formData.languageProficiency];
                                        updatedLanguages[index] = { ...lang, validityExpiry: new Date(e.target.value) };
                                        setFormData(prev => ({
                                          ...prev,
                                          languageProficiency: updatedLanguages
                                        }));
                                      }}
                                      placeholder="Valid until"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center text-sm text-green-600 font-medium">
                                      Valid for life
                        </div>
                                  )}
                    </div>
                  ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    languageProficiency: [...prev.languageProficiency, { language: '', level: '', validityExpiry: new Date() }]
                                  }));
                                }}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Language
                              </Button>
                            </div>
                          )}
                        </div>
                  </div>

                  {/* Save Button - Only show in edit mode */}
                  {!isViewMode && (
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

          {/* Step 2: License Details (for new uploads only) */}
          {currentStep === 2 && !isViewMode && !existingLicense && (
            <div className="space-y-6">
              {/* Essential License Fields */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 gap-3">
                    {/* I. State of issue */}
                  <div>
                      <Label htmlFor="stateOfIssue" className="text-sm font-medium text-gray-500">I. State of issue</Label>
                      <Input
                        id="stateOfIssue"
                        value={formData.stateOfIssue}
                        onChange={(e) => setFormData(prev => ({ ...prev, stateOfIssue: e.target.value }))}
                        placeholder="e.g., Romania"
                        className="mt-1"
                        required
                      />
                    </div>

                    {/* III. License number */}
                    <div>
                      <Label htmlFor="licenseNumber" className="text-sm font-medium text-gray-500">III. License number</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        placeholder="e.g., RO-123456"
                        className="mt-1"
                        required
                      />
                    </div>

                    {/* II. Titles of licenses with Date of issue and Country Code */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="licenseType" className="text-sm font-medium text-gray-500">II. Titles of licenses</Label>
                    <Select
                          value={formData.licenseType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, licenseType: value }))}
                    >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select license type" />
                      </SelectTrigger>
                      <SelectContent>
                            <SelectItem value="PPL(A)">PPL(A)</SelectItem>
                            <SelectItem value="CPL(A)">CPL(A)</SelectItem>
                            <SelectItem value="ATPL(A)">ATPL(A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                        <Label htmlFor="dateOfIssue" className="text-sm font-medium text-gray-500">Date of issue</Label>
                    <Input
                          id="dateOfIssue"
                      type="date"
                          value={formData.dateOfIssue}
                          onChange={(e) => setFormData(prev => ({ ...prev, dateOfIssue: e.target.value }))}
                          className="mt-1"
                          required
                    />
                  </div>

                  <div>
                        <Label htmlFor="countryCodeOfInitialIssue" className="text-sm font-medium text-gray-500">Country Code</Label>
                        <Input
                          id="countryCodeOfInitialIssue"
                          value={formData.countryCodeOfInitialIssue}
                          onChange={(e) => setFormData(prev => ({ ...prev, countryCodeOfInitialIssue: e.target.value }))}
                          placeholder="e.g., RO"
                          className="mt-1"
                          required
                          maxLength={2}
                        />
                      </div>
                    </div>

                    {/* XII. Ratings with multiple ratings support */}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">XII. Ratings</Label>
                      <div className="mt-1 space-y-3">
                        {formData.classTypeRatings.map((rating, index) => (
                          <div key={index} className="grid grid-cols-2 gap-3">
                            <Select
                              value={rating.rating}
                              onValueChange={(value) => {
                                const updatedRatings = [...formData.classTypeRatings];
                                updatedRatings[index] = { ...rating, rating: value };
                              setFormData(prev => ({
                                ...prev,
                                  classTypeRatings: updatedRatings
                              }));
                            }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SEP(land)">SEP(land)</SelectItem>
                                <SelectItem value="FI(A)-SEP(land)">FI(A)-SEP(land)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              value={rating.validUntil ? new Date(rating.validUntil).toISOString().split('T')[0] : ''}
                              onChange={(e) => {
                                const updatedRatings = [...formData.classTypeRatings];
                                updatedRatings[index] = { ...rating, validUntil: new Date(e.target.value) };
                                setFormData(prev => ({
                                  ...prev,
                                  classTypeRatings: updatedRatings
                                }));
                              }}
                              placeholder="Valid until"
                            />
                        </div>
                      ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              classTypeRatings: [...prev.classTypeRatings, { rating: '', validUntil: new Date(), remarks: '' }]
                            }));
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Rating
                        </Button>
                      </div>
                        </div>

                    {/* XIII. Remarks: Language Proficiency */}
                        <div>
                      <Label className="text-sm font-medium text-gray-500">XIII. Remarks: Language Proficiency</Label>
                      <div className="mt-1 space-y-3">
                        {formData.languageProficiency.map((lang, index) => (
                          <div key={index} className="grid grid-cols-3 gap-3">
                            <Select
                              value={lang.language}
                              onValueChange={(value) => {
                                const updatedLanguages = [...formData.languageProficiency];
                                updatedLanguages[index] = { ...lang, language: value };
                                setFormData(prev => ({
                                  ...prev,
                                  languageProficiency: updatedLanguages
                                }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="Romanian">Romanian</SelectItem>
                                <SelectItem value="French">French</SelectItem>
                                <SelectItem value="German">German</SelectItem>
                                <SelectItem value="Spanish">Spanish</SelectItem>
                                <SelectItem value="Italian">Italian</SelectItem>
                                <SelectItem value="Portuguese">Portuguese</SelectItem>
                                <SelectItem value="Russian">Russian</SelectItem>
                                <SelectItem value="Arabic">Arabic</SelectItem>
                                <SelectItem value="Chinese">Chinese</SelectItem>
                                <SelectItem value="Japanese">Japanese</SelectItem>
                                <SelectItem value="Korean">Korean</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={lang.level}
                              onValueChange={(value) => {
                                const updatedLanguages = [...formData.languageProficiency];
                                updatedLanguages[index] = { 
                                  ...lang, 
                                  level: value,
                                  // Clear validity date if level VI (valid for life)
                                  validityExpiry: value === 'VI' ? null : lang.validityExpiry
                                };
                                setFormData(prev => ({
                                  ...prev,
                                  languageProficiency: updatedLanguages
                                }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IV">Level IV</SelectItem>
                                <SelectItem value="V">Level V</SelectItem>
                                <SelectItem value="VI">Level VI (Valid for life)</SelectItem>
                              </SelectContent>
                            </Select>
                            {lang.level !== 'VI' ? (
                          <Input
                            type="date"
                                value={lang.validityExpiry ? new Date(lang.validityExpiry).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  const updatedLanguages = [...formData.languageProficiency];
                                  updatedLanguages[index] = { ...lang, validityExpiry: new Date(e.target.value) };
                                  setFormData(prev => ({
                                    ...prev,
                                    languageProficiency: updatedLanguages
                                  }));
                                }}
                                placeholder="Valid until"
                              />
                            ) : (
                              <div className="flex items-center justify-center text-sm text-green-600 font-medium">
                                Valid for life
                        </div>
                            )}
                    </div>
                  ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              languageProficiency: [...prev.languageProficiency, { language: '', level: '', validityExpiry: new Date() }]
                            }));
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Language
                        </Button>
                  </div>
                  </div>
                                       </div>
                   </div>
            </div>
          )}

          {/* Navigation - Only for new uploads (step 1 to step 2) */}
          {!existingLicense && currentStep === 2 && (
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
                  {isUploading ? 'Saving...' : 'Save License'}
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
