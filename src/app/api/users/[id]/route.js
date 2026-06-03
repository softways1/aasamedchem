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

// DELETE: Delete user (Admin only)
export async function DELETE(request, { params }) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return Response.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent admin from deleting themselves
    if (id === admin.userId) {
      return Response.json({ error: 'Cannot delete your own admin account.' }, { status: 400 });
    }

    await db.user.delete({
      where: { id }
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
