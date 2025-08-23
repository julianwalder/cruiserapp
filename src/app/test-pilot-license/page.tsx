'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PilotLicenseUpload } from '@/components/PilotLicenseUpload';
import { PilotLicense } from '@/types/pilot-documents';

export default function TestPilotLicensePage() {
  const [pilotLicenses, setPilotLicenses] = useState<PilotLicense[]>([]);
  const [pilotDocuments, setPilotDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPilotData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch('/api/my-account/pilot-documents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPilotDocuments(data.documents || []);
        setPilotLicenses(data.licenses || []);
      } else {
        console.error('Failed to fetch pilot data:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch pilot data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilotData();
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pilot License Upload Test</CardTitle>
          <CardDescription>
            Test the pilot license upload functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Current Licenses: {pilotLicenses.length}</h3>
              <p className="text-sm text-muted-foreground">
                Documents: {pilotDocuments.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchPilotData} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              <PilotLicenseUpload 
                onLicenseUploaded={(license) => {
                  setPilotLicenses([license, ...pilotLicenses]);
                  fetchPilotData(); // Refresh data
                }}
              />
            </div>
          </div>

          {pilotLicenses.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Uploaded Licenses:</h4>
              {pilotLicenses.map((license, index) => (
                <Card key={license.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">
                        {license.licenseType} - {license.licenseNumber}
                      </h5>
                      <PilotLicenseUpload 
                        existingLicense={license}
                        onLicenseUploaded={(updatedLicense) => {
                          setPilotLicenses(pilotLicenses.map(l => 
                            l.id === updatedLicense.id ? updatedLicense : l
                          ));
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="font-medium">State:</span> {license.stateOfIssue}
                      </div>
                      <div>
                        <span className="font-medium">Authority:</span> {license.issuingAuthority}
                      </div>
                      <div>
                        <span className="font-medium">Issue Date:</span> {new Date(license.dateOfIssue).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Nationality:</span> {license.nationality || 'N/A'}
                      </div>
                    </div>
                    {license.classTypeRatings && license.classTypeRatings.length > 0 && (
                      <div>
                        <span className="font-medium">Ratings:</span>
                        <div className="ml-4 space-y-1">
                          {license.classTypeRatings.map((rating, idx) => (
                            <div key={idx} className="text-sm">
                              {rating.rating} - Valid until: {new Date(rating.validUntil).toLocaleDateString()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {pilotDocuments.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Uploaded Documents:</h4>
              {pilotDocuments.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">{doc.fileName}</h5>
                      <p className="text-sm text-muted-foreground">
                        {doc.documentType} - {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
