'use client';

import { useSearchParams } from 'next/navigation';
import FlightLogs from '@/components/FlightLogs';

export default function FlightLogsPage() {
  const searchParams = useSearchParams();
  const openCreateModal = searchParams.get('create') === 'true';
  
  return <FlightLogs openCreateModal={openCreateModal} />;
} 