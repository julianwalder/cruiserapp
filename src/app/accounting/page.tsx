'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NewSidebar } from '@/components/NewSidebar';
import SmartBillStatus from '@/components/SmartBillStatus';
import ImportedXMLInvoices from '@/components/ImportedXMLInvoices';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Upload } from 'lucide-react';

export default function AccountingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Accounting page - Token:', token ? 'exists' : 'missing');
        
        if (!token) {
          console.log('Accounting page - No token, redirecting to login');
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Accounting page - Auth response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Accounting page - User data:', userData);
          
          if (!userData) {
            console.log('Accounting page - No user data, redirecting to login');
            router.push('/login');
            return;
          }

          // Check if user has access to accounting
          const hasAccess = userData.userRoles?.some((ur: any) => 
            ['SUPER_ADMIN', 'ADMIN'].includes(ur.roles.name)
          );

          if (!hasAccess) {
            console.log('Accounting page - User does not have access to accounting, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
          
          setUser(userData);
          setLoading(false);
        } else {
          console.log('Accounting page - Auth failed, redirecting to login');
          router.push('/login');
        }
      } catch (error) {
        console.error('Accounting page - Error fetching user:', error);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <NewSidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header className="bg-card shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-card-foreground">
                  Accounting & Invoicing
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-card-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-gray-900">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">Accounting & Invoicing</h2>
                <p className="text-muted-foreground">Manage your SmartBill invoices and financial data</p>
              </div>
            </div>
            
            <SmartBillStatus />
            
            <ImportedXMLInvoices />
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Planned Features
                  </CardTitle>
                  <CardDescription>
                    Upcoming financial management capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      Student billing and payment tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      Instructor payroll management
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      Aircraft maintenance cost tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      Financial reporting and analytics
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    SmartBill Integration
                  </CardTitle>
                  <CardDescription>
                    Connected invoice management system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Status</span>
                      <Badge variant="outline" className="text-xs">
                        Connected
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Sync</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Invoices</span>
                      <span className="text-xs font-medium">-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    XML Import Available
                  </CardTitle>
                  <CardDescription>
                    Import SmartBill XML invoices manually
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Import XML invoices while waiting for API activation.
                    </p>
                    <Button asChild className="w-full">
                      <a href="/xml-import">
                        Import XML Invoices
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 