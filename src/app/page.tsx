import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function HomePage() {
  // Check if user is already logged in using server-side cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const user = cookieStore.get('user')?.value;

  if (token && user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }

  // This won't be reached due to redirect, but needed for TypeScript
  return null;
}
