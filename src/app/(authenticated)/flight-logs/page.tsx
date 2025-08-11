import { cookies } from 'next/headers';
import FlightLogs from '@/components/FlightLogs';
import { requireFlightLogsAccessServer } from '@/lib/server-guards';

export default async function FlightLogsPage() {
  // Get token from cookies (server-side)
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  // Server-side role check - will call notFound() if unauthorized
  await requireFlightLogsAccessServer(token || '');
  
  return (
    <div className="space-y-6 mt-6">
      <FlightLogs openCreateModal={false} />
    </div>
  );
} 