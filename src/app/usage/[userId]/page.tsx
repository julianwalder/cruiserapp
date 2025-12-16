'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Map } from 'lucide-react';
import SettlementLedger from '@/components/SettlementLedger';

interface Package {
  id: string;
  invoiceId: string;
  totalHours: number;
  usedHours: number;
  charteredHours: number;
  remainingHours: number;
  purchaseDate: string;
  expiryDate?: string;
  status: string;
  price: number;
  currency: string;
}

interface UsageData {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  packages: Package[];
  totalPurchasedHours: number;
  totalUsedHours: number;
  totalCharteredHours: number;
  remainingHours: number;
  flightCount: number;
  statistics: {
    flownHours: {
      regular: number;
      regularCount: number;
    };
    charteredHours: {
      total: number;
      count: number;
    };
    demoHours: {
      total: number;
      count: number;
    };
    ferryHours: {
      total: number;
      count: number;
    };
    pilotCharterHours: {
      total: number;
      count: number;
    };
  };
}

export default function UserUsagePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/usage/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUsageData();
    }
  }, [userId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const userName = data.user.firstName && data.user.lastName
    ? `${data.user.firstName} ${data.user.lastName}`
    : data.user.email;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/usage')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{userName}</h1>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => router.push(`/usage/${userId}/heatmap`)}
        >
          <Map className="h-4 w-4 mr-2" />
          Heatmap
        </Button>
      </div>

      {/* Chronological Settlement Ledger */}
      <SettlementLedger userId={userId} />
    </div>
  );
}
