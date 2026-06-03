import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { hashPassword, signSession, verifySession } from '@/lib/auth';

// GET: Check session status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = await verifySession(token);
    
    if (!session) {
      return Response.json({ authenticated: false }, { status: 200 });
    }
    
    return Response.json({
      authenticated: true,
      user: {
        id: session.userId,
        username: session.username,
        role: session.role,
        name: session.name
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Log in and set cookie
export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return Response.json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    const user = await db.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      return Response.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    
    const hashed = await hashPassword(password);
    if (user.passwordHash !== hashed) {
      return Response.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    
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
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Log out and clear cookie
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.set('session', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0 // Expire immediately
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
