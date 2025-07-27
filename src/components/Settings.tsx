"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Database, 
  Download,
  CheckCircle,
  AlertTriangle,
  Save,
  Plane
} from 'lucide-react';
import OperationalAreaManagement from './OperationalAreaManagement';
import IcaoImportTab from './IcaoImportTab';
import UsersImportTab from './UsersImportTab';
import FlightLogsImportTab from './FlightLogsImportTab';
import FleetImportTab from './FleetImportTab';
import { DATE_FORMATS, type DateFormat } from '@/lib/date-utils';
import { useDateFormat } from '@/contexts/DateFormatContext';



interface SystemSettings {
  schoolName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  timezone: string;
  currency: string;
  language: string;
  dateFormat: DateFormat;
  maintenanceMode: boolean;
  autoBackup: boolean;
  backupFrequency: string;
}

export default function Settings() {
  const { dateFormat, setDateFormat } = useDateFormat();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    schoolName: 'Cruiser Aviation',
    contactEmail: 'admin@cruiseraviation.com',
    contactPhone: '+1 (555) 123-4567',
    address: '123 Aviation Way, Flight City, FC 12345',
    timezone: 'UTC-5',
    currency: 'USD',
    language: 'en',
    dateFormat: dateFormat,
    maintenanceMode: false,
    autoBackup: true,
    backupFrequency: 'daily'
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (error) {
        // ignore
      }
    };
    fetchCurrentUser();
  }, []);
  const isSuperAdmin = currentUser?.userRoles?.some((userRole: any) => userRole.role.name === 'SUPER_ADMIN');


  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };



  const timezones = [
    'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
    'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
    'UTC+4', 'UTC+5', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK'];
  const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-card-foreground">System Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure system-wide settings and manage operational areas
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="operational-areas">Operational Areas</TabsTrigger>
          <TabsTrigger value="icao-import">ICAO Import</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="users-import">Users Import</TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="fleet-import">Fleet Import</TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="flight-logs-import">Flight Logs Import</TabsTrigger>
          )}
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="backup">Backup & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
              <CardDescription>
                Configure basic system information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    value={systemSettings.schoolName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, schoolName: e.target.value }))}
                    placeholder="Enter school name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={systemSettings.contactEmail}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={systemSettings.contactPhone}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={systemSettings.timezone} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={systemSettings.currency} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((curr) => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={systemSettings.language} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select 
                    value={systemSettings.dateFormat} 
                    onValueChange={(value: DateFormat) => {
                      setSystemSettings(prev => ({ ...prev, dateFormat: value }));
                      setDateFormat(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((format) => (
                        <SelectItem key={format.format} value={format.format}>
                          <div className="flex flex-col">
                            <span>{format.displayName}</span>
                            <span className="text-xs text-muted-foreground">{format.example}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={systemSettings.address}
                  onChange={(e) => setSystemSettings(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational-areas" className="space-y-6">
          <OperationalAreaManagement />
        </TabsContent>

        <TabsContent value="icao-import" className="space-y-6">
          <IcaoImportTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="users-import" className="space-y-6">
            <UsersImportTab />
          </TabsContent>
        )}
        {isSuperAdmin && (
          <TabsContent value="fleet-import" className="space-y-6">
            <FleetImportTab />
          </TabsContent>
        )}
        {isSuperAdmin && (
          <TabsContent value="flight-logs-import" className="space-y-6">
            <FlightLogsImportTab />
          </TabsContent>
        )}

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Configure security and access control settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Maintenance Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Enable maintenance mode to restrict access during system updates
                    </p>
                  </div>
                  <Button 
                    variant={systemSettings.maintenanceMode ? "default" : "outline"}
                    onClick={() => setSystemSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  >
                    {systemSettings.maintenanceMode ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Session Timeout</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically log out users after inactivity
                    </p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all user accounts
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Backup & Export</span>
              </CardTitle>
              <CardDescription>
                Manage data backup and export settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Automatic Backups</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup system data
                    </p>
                  </div>
                  <Button 
                    variant={systemSettings.autoBackup ? "default" : "outline"}
                    onClick={() => setSystemSettings(prev => ({ ...prev, autoBackup: !prev.autoBackup }))}
                  >
                    {systemSettings.autoBackup ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                {systemSettings.autoBackup && (
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select 
                      value={systemSettings.backupFrequency} 
                      onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backupFrequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Manual Export</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <Download className="h-6 w-6" />
                      <span>Export Users</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <Download className="h-6 w-6" />
                      <span>Export Airfields</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <Download className="h-6 w-6" />
                      <span>Export Reports</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <Download className="h-6 w-6" />
                      <span>Full Backup</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 