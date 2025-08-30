import { cookies } from 'next/headers';
import FlightLogs from '@/components/FlightLogs';
import { requireFlightLogsAccessServer } from '@/lib/server-guards';
import { redirect } from 'next/navigation';

export default async function FlightLogsPage() {
  // Get token from cookies (server-side)
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  console.log('🔍 FlightLogsPage - Server-side token check:', {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
    allCookies: cookieStore.getAll().map(c => c.name)
  });
  
  // Server-side role check - will call notFound() if unauthorized
  try {
    await requireFlightLogsAccessServer(token || '');
    console.log('🔍 FlightLogsPage - Server-side authentication successful');
  } catch (error) {
    console.error('🔍 FlightLogsPage - Server-side authentication failed:', error);
    
    // Instead of notFound(), redirect to login with a specific error message
    // This allows the client-side to handle the authentication properly
    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    loginUrl.searchParams.set('redirect', '/flight-logs');
    loginUrl.searchParams.set('error', 'auth_required');
    redirect(loginUrl.toString());
  }
  
  return (
    <div className="space-y-6 mt-6">
      <FlightLogs openCreateModal={false} />
    </div>
  );
} 