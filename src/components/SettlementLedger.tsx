'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Receipt, Plane, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface LedgerEntry {
  date: string;
  eventType: 'invoice' | 'flight';
  reference: string;
  description: string;
  hoursAdded: number;
  hoursDeducted: number;
  balanceDue: number;
  flightType?: string;
  role?: string;
  invoiceAmount?: number;
  currency?: string;
  flightId?: string;
}

interface HoursByType {
  invoiced: { hours: number; count: number };
  school: { hours: number; count: number };
  charter: { hours: number; count: number };
  demo: { hours: number; count: number };
  ferry: { hours: number; count: number };
}

interface LedgerSummary {
  totalHoursAdded: number;
  totalHoursDeducted: number;
  finalBalance: number;
  entryCount: number;
  invoiceCount: number;
  flightCount: number;
  hoursByType: HoursByType;
}

interface SettlementLedgerProps {
  userId: string;
}

export default function SettlementLedger({ userId }: SettlementLedgerProps) {
  const router = useRouter();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/usage/${userId}/ledger`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch ledger data');
        }

        const data = await response.json();
        setLedgerEntries(data.ledgerEntries || []);
        setSummary(data.summary || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchLedger();
    }
  }, [userId]);

  const formatHours = (hours: number) => {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) - h) * 60);
    const formatted = `${h}:${m.toString().padStart(2, '0')}`;
    return hours < 0 ? `-${formatted}` : formatted;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const handleRowClick = (entry: LedgerEntry) => {
    if (entry.eventType === 'flight') {
      // Use the full flightId from the entry
      const flightId = entry.flightId;
      if (flightId) {
        router.push(`/usage/${userId}/flight/${flightId}`);
      }
    } else if (entry.eventType === 'invoice') {
      // Navigate to invoice detail page (using smartbill_id from reference)
      router.push(`/usage/${userId}/invoice/${entry.reference}`);
    }
  };

  const getFlightTypeColor = (flightType?: string) => {
    // All flight type labels are grey
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chronological Settlement Ledger</CardTitle>
          <CardDescription>Loading ledger entries...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chronological Settlement Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Chronological Settlement Ledger
        </CardTitle>
        <CardDescription>
          Complete history of hour packages purchased and flights flown
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Consolidated Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4 mb-6 p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-lg border border-blue-100">
            {/* Overall Stats */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Invoices</p>
              <p className="text-xl font-bold">{summary.invoiceCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Flights</p>
              <p className="text-xl font-bold">{summary.flightCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Hours Purchased</p>
              <p className="text-xl font-bold text-green-600">
                +{formatHours(summary.totalHoursAdded)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Current Balance</p>
              <p className={cn(
                "text-xl font-bold",
                summary.finalBalance < 0 ? "text-red-600" : "text-green-600"
              )}>
                {formatHours(summary.finalBalance)}
              </p>
            </div>

            {/* Flight Type Breakdown */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Invoiced Hours</p>
              <p className="text-xl font-bold text-gray-700">
                {formatHours(summary.hoursByType.invoiced.hours)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.hoursByType.invoiced.count} flights
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">School Hours</p>
              <p className="text-xl font-bold text-gray-700">
                {formatHours(summary.hoursByType.school.hours)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.hoursByType.school.count} flights
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Charter Hours</p>
              <p className="text-xl font-bold text-gray-700">
                {formatHours(summary.hoursByType.charter.hours)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.hoursByType.charter.count} flights
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Demo Hours</p>
              <p className="text-xl font-bold text-gray-700">
                {formatHours(summary.hoursByType.demo.hours)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.hoursByType.demo.count} flights
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Ferry Hours</p>
              <p className="text-xl font-bold text-gray-700">
                {formatHours(summary.hoursByType.ferry.hours)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.hoursByType.ferry.count} flights
              </p>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Event</th>
                <th className="text-left py-3 px-4 font-medium">Reference</th>
                <th className="text-left py-3 px-4 font-medium">Description</th>
                <th className="text-right py-3 px-4 font-medium">Hours +</th>
                <th className="text-right py-3 px-4 font-medium">Hours –</th>
                <th className="text-right py-3 px-4 font-medium">Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No ledger entries found
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry, index) => (
                  <tr
                    key={`${entry.eventType}-${entry.reference}-${index}`}
                    onClick={() => handleRowClick(entry)}
                    className={cn(
                      "border-b hover:bg-muted/50 transition-colors cursor-pointer",
                      entry.eventType === 'invoice' && "bg-green-50/50"
                    )}
                  >
                    <td className="py-3 px-4 text-sm">
                      {formatDate(entry.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {entry.eventType === 'invoice' ? (
                          <>
                            <Receipt className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Invoice</span>
                          </>
                        ) : (
                          <>
                            <Plane className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Flight</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {entry.reference}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {entry.eventType === 'invoice' && (
                          <span className="text-sm">{entry.description}</span>
                        )}
                        {entry.flightType && (
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getFlightTypeColor(entry.flightType))}
                          >
                            {entry.flightType}
                          </Badge>
                        )}
                        {entry.role && entry.role !== 'PILOT' && (
                          <Badge variant="outline" className="text-xs">
                            {entry.role}
                          </Badge>
                        )}
                      </div>
                      {entry.invoiceAmount && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(entry.invoiceAmount, entry.currency || 'RON')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {entry.hoursAdded > 0 && (
                        <span className="text-sm font-medium text-green-600 flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {formatHours(entry.hoursAdded)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {entry.hoursDeducted > 0 && (
                        <span className="text-sm font-medium text-red-600 flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {formatHours(entry.hoursDeducted)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn(
                        "text-sm font-bold",
                        entry.balanceDue < 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {formatHours(entry.balanceDue)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
