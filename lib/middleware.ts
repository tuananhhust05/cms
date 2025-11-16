import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getCachedUser, hasPermission } from './auth';

export interface AuthRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  };
}

export async function authenticate(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const user = await getCachedUser(decoded.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  (request as AuthRequest).user = user;
  return null;
}

export function requireAuth(requiredRole: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'VIEWER') {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const authError = await authenticate(request);
    if (authError) {
      return authError;
    }

    const user = (request as AuthRequest).user;
    if (!user || !hasPermission(user.role, requiredRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null;
  };
}

