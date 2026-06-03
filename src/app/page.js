import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = await verifySession(token);

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/admin');
  } else if (session.role === 'SELLER') {
    redirect('/seller');
  } else {
    redirect('/customer');
  }
}
