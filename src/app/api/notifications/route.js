import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  return verifySession(token);
}

// GET: Retrieve notifications for logged-in user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(notifications);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Mark all notifications as read for logged-in user
export async function PUT() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.notification.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true }
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
