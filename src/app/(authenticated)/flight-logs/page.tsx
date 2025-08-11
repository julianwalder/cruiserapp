'use client';

import { useSearchParams } from 'next/navigation';
import FlightLogs from '@/components/FlightLogs';

export default function FlightLogsPage() {
  const searchParams = useSearchParams();
  const openCreateModal = searchParams.get('create') === 'true';
  
  return (
    <div className="space-y-6 mt-6">
      <FlightLogs openCreateModal={openCreateModal} />
    </div>
  );
} 