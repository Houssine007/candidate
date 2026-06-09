import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Même secret JWT que la plateforme RH (FastAPI)
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_fixed_for_stability_change_in_prod';

export interface LMSUser {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'RECRUITER' | 'CANDIDATE';
  company_id?: number;
}

export async function getAuthUser(req: NextRequest): Promise<LMSUser | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    return {
      id: payload.sub as unknown as number,
      email: payload.email as string,
      full_name: payload.full_name as string,
      role: payload.role as LMSUser['role'],
      company_id: payload.company_id as number | undefined,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<LMSUser> {
  const user = await getAuthUser(req);
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireRole(req: NextRequest, roles: LMSUser['role'][]): Promise<LMSUser> {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) throw new Error('Forbidden');
  return user;
}
