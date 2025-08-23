'use client';

import { useState, useRef, useEffect } from 'react';
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
  type PilotLicense,
  type ClassTypeRating,
  type LanguageProficiency,
  type ExaminerSignature
} from '@/types/pilot-documents';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { toast } from 'sonner';

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
    
    // Holder Information
    placeOfBirth: '',
    nationality: '',
    
    // License Details
    stateOfIssue: '',
    issuingAuthority: '',
    licenseNumber: '',
    licenseType: '',
    dateOfInitialIssue: '',
    countryCodeOfInitialIssue: '',
    dateOfIssue: '',
    issuingOfficerName: '',
    issuingAuthoritySeal: null as File | null,
    
    // Ratings & Privileges
    classTypeRatings: [] as ClassTypeRating[],
    irValidUntil: '',
    
    // Language Proficiency
    languageProficiency: [] as LanguageProficiency[],
    
    // Medical Requirements
    medicalClassRequired: '',
    medicalCertificateExpiry: '',
    
    // Radio Telephony
    radiotelephonyLanguages: [] as string[],
    radiotelephonyRemarks: '',
    
    // Signatures
    holderSignaturePresent: false,
    examinerSignatures: [] as ExaminerSignature[],
    
    // Additional Information
    icaoCompliant: true,
    abbreviationsReference: '',
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
        
        // Holder Information
        placeOfBirth: existingLicense.place_of_birth || '',
        nationality: existingLicense.nationality || '',
        
        // License Details
        stateOfIssue: existingLicense.state_of_issue || '',
        issuingAuthority: existingLicense.issuing_authority || '',
        licenseNumber: existingLicense.license_number || '',
        licenseType: existingLicense.license_type || '',
        dateOfInitialIssue: existingLicense.date_of_initial_issue || '',
        countryCodeOfInitialIssue: existingLicense.country_code_of_initial_issue || '',
        dateOfIssue: existingLicense.date_of_issue || '',
        issuingOfficerName: existingLicense.issuing_officer_name || '',
        issuingAuthoritySeal: null as File | null,
        
        // Ratings & Privileges
        classTypeRatings: existingLicense.class_type_ratings || [] as ClassTypeRating[],
        irValidUntil: existingLicense.ir_valid_until || '',
        
        // Language Proficiency
        languageProficiency: existingLicense.language_proficiency || [] as LanguageProficiency[],
        
        // Medical Requirements
        medicalClassRequired: existingLicense.medical_class_required || '',
        medicalCertificateExpiry: existingLicense.medical_certificate_expiry || '',
        
        // Radio Telephony
        radiotelephonyLanguages: existingLicense.radiotelephony_languages || [] as string[],
        radiotelephonyRemarks: existingLicense.radiotelephony_remarks || '',
        
        // Signatures
        holderSignaturePresent: existingLicense.holder_signature_present || false,
        examinerSignatures: existingLicense.examiner_signatures || [] as ExaminerSignature[],
        
        // Additional Information
        icaoCompliant: existingLicense.icao_compliant ?? true,
        abbreviationsReference: existingLicense.abbreviations_reference || '',
      });
    }
  }, [existingLicense]);

  const handleViewFile = (fileUrl: string, fileName: string, fileType: string) => {
    setSelectedFile({ url: fileUrl, name: fileName, type: fileType });
    setShowFileViewer(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

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
        throw new Error('Failed to upload file');
      }

      const { document } = await response.json();
      setUploadedDocumentId(document.id);
      setFormData(prev => ({ ...prev, licenseFile: file }));
      toast.success('License file uploaded successfully');
      setCurrentStep(2);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload license file');
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
            submitFormData.append(key, value.toString());
          } else if (value instanceof File) {
            submitFormData.append(key, value);
          } else {
            submitFormData.append(key, value.toString());
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
      placeOfBirth: '',
      nationality: '',
      stateOfIssue: '',
      issuingAuthority: '',
      licenseNumber: '',
      licenseType: '',
      dateOfInitialIssue: '',
      countryCodeOfInitialIssue: '',
      dateOfIssue: '',
      issuingOfficerName: '',
      issuingAuthoritySeal: null,
      classTypeRatings: [],
      irValidUntil: '',
      languageProficiency: [],
      medicalClassRequired: '',
      medicalCertificateExpiry: '',
      radiotelephonyLanguages: [],
      radiotelephonyRemarks: '',
      holderSignaturePresent: false,
      examinerSignatures: [],
      icaoCompliant: true,
      abbreviationsReference: '',
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

  const addExaminerSignature = () => {
    setFormData(prev => ({
      ...prev,
      examinerSignatures: [...prev.examinerSignatures, { name: '', title: '', date: new Date() }]
    }));
  };

  const removeExaminerSignature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examinerSignatures: prev.examinerSignatures.filter((_, i) => i !== index)
    }));
  };

  const updateExaminerSignature = (index: number, field: keyof ExaminerSignature, value: any) => {
    setFormData(prev => ({
      ...prev,
      examinerSignatures: prev.examinerSignatures.map((sig, i) => 
        i === index ? { ...sig, [field]: value } : sig
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
        
        // Holder Information
        placeOfBirth: existingLicense.place_of_birth || '',
        nationality: existingLicense.nationality || '',
        
        // License Details
        stateOfIssue: existingLicense.state_of_issue || '',
        issuingAuthority: existingLicense.issuing_authority || '',
        licenseNumber: existingLicense.license_number || '',
        licenseType: existingLicense.license_type || '',
        dateOfInitialIssue: existingLicense.date_of_initial_issue || '',
        countryCodeOfInitialIssue: existingLicense.country_code_of_initial_issue || '',
        dateOfIssue: existingLicense.date_of_issue || '',
        issuingOfficerName: existingLicense.issuing_officer_name || '',
        issuingAuthoritySeal: null as File | null,
        
        // Ratings & Privileges
        classTypeRatings: existingLicense.class_type_ratings || [] as ClassTypeRating[],
        irValidUntil: existingLicense.ir_valid_until || '',
        
        // Language Proficiency
        languageProficiency: existingLicense.language_proficiency || [] as LanguageProficiency[],
        
        // Medical Requirements
        medicalClassRequired: existingLicense.medical_class_required || '',
        medicalCertificateExpiry: existingLicense.medical_certificate_expiry || '',
        
        // Radio Telephony
        radiotelephonyLanguages: existingLicense.radiotelephony_languages || [] as string[],
        radiotelephonyRemarks: existingLicense.radiotelephony_remarks || '',
        
        // Signatures
        holderSignaturePresent: existingLicense.holder_signature_present || false,
        examinerSignatures: existingLicense.examiner_signatures || [] as ExaminerSignature[],
        
        // Additional Information
        icaoCompliant: existingLicense.icao_compliant ?? true,
        abbreviationsReference: existingLicense.abbreviations_reference || '',
      });
    }
  };

  return (
    <>
      <Button variant={existingLicense ? "outline" : "default"} size="sm" onClick={handleOpen}>
        {existingLicense ? (
          <>
            <Eye className="h-4 w-4 mr-2" />
            View/Edit
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload License
          </>
        )}
      </Button>
      
      <Modal
        open={isOpen}
        onClose={handleClose}
        title={`${existingLicense ? (isViewMode ? 'View Pilot License' : 'Edit Pilot License') : 'Upload Pilot License'}`}
        description={
          existingLicense 
            ? (isViewMode ? 'View your pilot license information' : 'Update your pilot license information')
            : 'Upload and configure your pilot license details'
        }
        headerActions={
          existingLicense && (
            <Button variant="outline" size="sm" onClick={toggleViewMode}>
              {isViewMode ? 'Edit' : 'View'}
            </Button>
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

          {/* View Mode - Document Information */}
          {isViewMode && existingLicense && (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Uploaded Document</h3>
              </div>
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Document File:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {existingLicense.pilot_documents?.[0]?.file_name || 'Document uploaded'}
                    </span>
                    {existingLicense.pilot_documents?.[0]?.file_url && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewFile(
                            existingLicense.pilot_documents[0].file_url,
                            existingLicense.pilot_documents[0].file_name || 'Document',
                            existingLicense.pilot_documents[0].mime_type || 'application/pdf'
                          )}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View in Modal
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={existingLicense.pilot_documents[0].file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Upload Date:</span>
                  <span className="text-sm text-gray-600">
                    {existingLicense.pilot_documents?.[0]?.created_at 
                      ? new Date(existingLicense.pilot_documents[0].created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : existingLicense.pilot_documents?.[0]?.uploaded_at
                      ? new Date(existingLicense.pilot_documents[0].uploaded_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Document Type:</span>
                  <span className="text-sm text-gray-600">
                    {existingLicense.pilot_documents?.[0]?.document_type || 'Pilot License'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">File Size:</span>
                  <span className="text-sm text-gray-600">
                    {existingLicense.pilot_documents?.[0]?.file_size 
                      ? `${(existingLicense.pilot_documents[0].file_size / 1024 / 1024).toFixed(2)} MB`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: License Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Holder Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Holder Information</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Personal information of the license holder
                </p>
                <div className="bg-white rounded-lg p-4">
                  {isViewMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Place of Birth</span>
                        <p className="text-gray-900">{existingLicense?.place_of_birth || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Nationality</span>
                        <p className="text-gray-900">{existingLicense?.nationality || 'Not specified'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="placeOfBirth">Place of Birth</Label>
                        <Input
                          id="placeOfBirth"
                          value={formData.placeOfBirth}
                          onChange={(e) => setFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))}
                          placeholder="City, Country"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input
                          id="nationality"
                          value={formData.nationality}
                          onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                          placeholder="e.g., Romanian"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* License Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">License Details</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Official license information
                </p>
                <div className="bg-white rounded-lg p-4">
                  {isViewMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">State of Issue</span>
                        <p className="text-gray-900">{existingLicense?.state_of_issue || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Issuing Authority</span>
                        <p className="text-gray-900">{existingLicense?.issuing_authority || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">License Number</span>
                        <p className="text-gray-900">{existingLicense?.license_number || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">License Type</span>
                        <p className="text-gray-900">{existingLicense?.license_type || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Date of Initial Issue</span>
                        <p className="text-gray-900">
                          {existingLicense?.date_of_initial_issue 
                            ? new Date(existingLicense.date_of_initial_issue).toLocaleDateString()
                            : 'Not specified'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Country Code of Initial Issue</span>
                        <p className="text-gray-900">{existingLicense?.country_code_of_initial_issue || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Date of Issue</span>
                        <p className="text-gray-900">
                          {existingLicense?.date_of_issue 
                            ? new Date(existingLicense.date_of_issue).toLocaleDateString()
                            : 'Not specified'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Issuing Officer Name</span>
                        <p className="text-gray-900">{existingLicense?.issuing_officer_name || 'Not specified'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="stateOfIssue">State of Issue *</Label>
                        <Input
                          id="stateOfIssue"
                          value={formData.stateOfIssue}
                          onChange={(e) => setFormData(prev => ({ ...prev, stateOfIssue: e.target.value }))}
                          placeholder="e.g., Romania"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="issuingAuthority">Issuing Authority *</Label>
                        <Input
                          id="issuingAuthority"
                          value={formData.issuingAuthority}
                          onChange={(e) => setFormData(prev => ({ ...prev, issuingAuthority: e.target.value }))}
                          placeholder="e.g., Romanian Civil Aviation Authority"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="licenseNumber">License Number *</Label>
                        <Input
                          id="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                          placeholder="e.g., RO-123456"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="licenseType">License Type *</Label>
                        <Select
                          value={formData.licenseType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, licenseType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select license type" />
                          </SelectTrigger>
                          <SelectContent>
                            {LICENSE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dateOfInitialIssue">Date of Initial Issue *</Label>
                        <Input
                          id="dateOfInitialIssue"
                          type="date"
                          value={formData.dateOfInitialIssue}
                          onChange={(e) => setFormData(prev => ({ ...prev, dateOfInitialIssue: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="countryCodeOfInitialIssue">Country Code of Initial Issue *</Label>
                        <Input
                          id="countryCodeOfInitialIssue"
                          value={formData.countryCodeOfInitialIssue}
                          onChange={(e) => setFormData(prev => ({ ...prev, countryCodeOfInitialIssue: e.target.value }))}
                          placeholder="e.g., RO"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateOfIssue">Date of Issue *</Label>
                        <Input
                          id="dateOfIssue"
                          type="date"
                          value={formData.dateOfIssue}
                          onChange={(e) => setFormData(prev => ({ ...prev, dateOfIssue: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="issuingOfficerName">Issuing Officer Name</Label>
                        <Input
                          id="issuingOfficerName"
                          value={formData.issuingOfficerName}
                          onChange={(e) => setFormData(prev => ({ ...prev, issuingOfficerName: e.target.value }))}
                          placeholder="Name of issuing officer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ratings & Privileges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Ratings & Privileges
                  </CardTitle>
                  <CardDescription>
                    Aircraft ratings and privileges
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Class/Type Ratings</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addClassTypeRating}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rating
                    </Button>
                  </div>
                  
                  {formData.classTypeRatings.map((rating, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">Rating {index + 1}</h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeClassTypeRating(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label>Rating</Label>
                          <Input
                            value={rating.rating}
                            onChange={(e) => updateClassTypeRating(index, 'rating', e.target.value)}
                            placeholder="e.g., SEP(land)"
                          />
                        </div>
                        <div>
                          <Label>Valid Until</Label>
                          <Input
                            type="date"
                            value={formatDate(rating.validUntil, 'yyyy-MM-dd')}
                            onChange={(e) => updateClassTypeRating(index, 'validUntil', new Date(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Remarks</Label>
                          <Input
                            value={rating.remarks || ''}
                            onChange={(e) => updateClassTypeRating(index, 'remarks', e.target.value)}
                            placeholder="Optional remarks"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div>
                    <Label htmlFor="irValidUntil">IR Valid Until</Label>
                    <Input
                      id="irValidUntil"
                      type="date"
                      value={formData.irValidUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, irValidUntil: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Language Proficiency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Language Proficiency
                  </CardTitle>
                  <CardDescription>
                    Language proficiency endorsements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Languages</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addLanguageProficiency}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Language
                    </Button>
                  </div>
                  
                  {formData.languageProficiency.map((lang, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">Language {index + 1}</h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLanguageProficiency(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label>Language</Label>
                          <Select
                            value={lang.language}
                            onValueChange={(value) => updateLanguageProficiency(index, 'language', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              {AVIATION_LANGUAGES.map((language) => (
                                <SelectItem key={language} value={language}>
                                  {language}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Level</Label>
                          <Select
                            value={lang.level}
                            onValueChange={(value) => updateLanguageProficiency(index, 'level', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGE_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Valid Until</Label>
                          <Input
                            type="date"
                            value={formatDate(lang.validityExpiry, 'yyyy-MM-dd')}
                            onChange={(e) => updateLanguageProficiency(index, 'validityExpiry', new Date(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Medical Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Medical Requirements
                  </CardTitle>
                  <CardDescription>
                    Medical certificate information
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medicalClassRequired">Medical Class Required</Label>
                    <Select
                      value={formData.medicalClassRequired}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, medicalClassRequired: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select medical class" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDICAL_CLASSES.map((medicalClass) => (
                          <SelectItem key={medicalClass} value={medicalClass}>
                            {medicalClass}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="medicalCertificateExpiry">Medical Certificate Expiry</Label>
                    <Input
                      id="medicalCertificateExpiry"
                      type="date"
                      value={formData.medicalCertificateExpiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, medicalCertificateExpiry: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Radio Telephony */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5" />
                    Radio Telephony
                  </CardTitle>
                  <CardDescription>
                    Radio telephony privileges
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Radiotelephony Languages</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {AVIATION_LANGUAGES.map((language) => (
                        <div key={language} className="flex items-center space-x-2">
                          <Checkbox
                            id={`radio-${language}`}
                            checked={formData.radiotelephonyLanguages.includes(language)}
                            onCheckedChange={(checked) => {
                              setFormData(prev => ({
                                ...prev,
                                radiotelephonyLanguages: checked
                                  ? [...prev.radiotelephonyLanguages, language]
                                  : prev.radiotelephonyLanguages.filter(l => l !== language)
                              }));
                            }}
                          />
                          <Label htmlFor={`radio-${language}`} className="text-sm">
                            {language}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="radiotelephonyRemarks">Remarks</Label>
                    <Textarea
                      id="radiotelephonyRemarks"
                      value={formData.radiotelephonyRemarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, radiotelephonyRemarks: e.target.value }))}
                      placeholder="e.g., Can only be exercised with valid language proficiency endorsement"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Signatures */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Signature className="h-5 w-5" />
                    Signatures
                  </CardTitle>
                  <CardDescription>
                    Signature information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="holderSignaturePresent"
                      checked={formData.holderSignaturePresent}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, holderSignaturePresent: checked as boolean }))}
                    />
                    <Label htmlFor="holderSignaturePresent">Holder's signature present</Label>
                  </div>

                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Examiner Signatures</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addExaminerSignature}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Signature
                    </Button>
                  </div>
                  
                  {formData.examinerSignatures.map((signature, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">Examiner {index + 1}</h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExaminerSignature(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={signature.name}
                            onChange={(e) => updateExaminerSignature(index, 'name', e.target.value)}
                            placeholder="Examiner name"
                          />
                        </div>
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={signature.title}
                            onChange={(e) => updateExaminerSignature(index, 'title', e.target.value)}
                            placeholder="Examiner title"
                          />
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={formatDate(signature.date, 'yyyy-MM-dd')}
                            onChange={(e) => updateExaminerSignature(index, 'date', new Date(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Additional Information
                  </CardTitle>
                  <CardDescription>
                    Additional license information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="icaoCompliant"
                      checked={formData.icaoCompliant}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, icaoCompliant: checked as boolean }))}
                    />
                    <Label htmlFor="icaoCompliant">ICAO compliant</Label>
                  </div>
                  <div>
                    <Label htmlFor="abbreviationsReference">Abbreviations Reference</Label>
                    <Input
                      id="abbreviationsReference"
                      value={formData.abbreviationsReference}
                      onChange={(e) => setFormData(prev => ({ ...prev, abbreviationsReference: e.target.value }))}
                      placeholder="Reference to abbreviations section"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            {currentStep === 2 && !isViewMode && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                Back to File Upload
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {currentStep === 2 && !isViewMode && (
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading}
                >
                  {isUploading ? 'Saving...' : 'Save License'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* File Viewer Modal */}
      <Modal
        open={showFileViewer}
        onClose={() => setShowFileViewer(false)}
        title={`Viewing: ${selectedFile?.name || 'Document'}`}
        description="View your uploaded pilot license document"
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
