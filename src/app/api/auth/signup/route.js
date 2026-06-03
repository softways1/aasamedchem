import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { hashPassword, signSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password, name, role } = await request.json();

    if (!username || !password || !name || !role) {
      return Response.json({ error: 'Username, password, name, and role are required' }, { status: 400 });
    }

    const normalizedRole = role.toUpperCase();
    if (normalizedRole !== 'SELLER' && normalizedRole !== 'CUSTOMER') {
      return Response.json({ error: 'Invalid role. Must be SELLER or CUSTOMER' }, { status: 400 });
    }

    // Check if username is already taken
    const existingUser = await db.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return Response.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // Hash password & create user
    const hashed = await hashPassword(password);
    const user = await db.user.create({
      data: {
        username,
        passwordHash: hashed,
        role: normalizedRole,
        name
      }
    });

    // Create session token
    const sessionToken = await signSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    });

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return Response.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
