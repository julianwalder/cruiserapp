import { cookies } from 'next/headers';
import RoleManagementClient from './RoleManagementClient';
import { requireRoleManagementAccessServer } from '@/lib/server-guards';

export default async function RoleManagementPage() {
  // Get token from cookies (server-side)
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  // Server-side role check - will call notFound() if unauthorized
  await requireRoleManagementAccessServer(token || '');
  
  return <RoleManagementClient />;
}
