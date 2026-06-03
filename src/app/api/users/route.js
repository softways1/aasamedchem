import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = await verifySession(token);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// GET: Fetch all users (Admin only)
export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return Response.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(users);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
