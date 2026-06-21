import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Même secret JWT que la plateforme RH (FastAPI)
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_fixed_for_stability_change_in_prod';

export interface LMSUser {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'RECRUITER' | 'CANDIDATE' | 'EMPLOYEE';
  is_instructor?: boolean;
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
      id: parseInt(payload.sub as string),
      email: payload.email as string,
      full_name: payload.full_name as string,
      role: payload.role as LMSUser['role'],
      company_id: payload.company_id as number | undefined,
      is_instructor: payload.is_instructor as boolean | undefined,
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


export async function requireInstructor(req: NextRequest): Promise<LMSUser> {
  const user = await requireAuth(req);
  if (!user.is_instructor && user.role !== 'ADMIN') throw new Error('Forbidden');
  return user;
}

// Vérifie qu'un instructeur est autorisé (flag is_instructor ou ADMIN système)
// et renvoie soit l'utilisateur, soit une réponse d'erreur prête à retourner.
// Source de vérité unique pour toutes les routes /api/instructor/* — remplace
// les vérifications JWT manuelles (jsonwebtoken + role === 'instructor').
export type InstructorAuth =
  | { ok: true; user: LMSUser }
  | { ok: false; res: NextResponse };

export async function authorizeInstructor(req: NextRequest): Promise<InstructorAuth> {
  const user = await getAuthUser(req);
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!user.is_instructor && user.role !== 'ADMIN') {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, user };
}

// True si l'utilisateur peut accéder à toutes les ressources (pas de filtrage
// par propriétaire). Un ADMIN voit tout ; un instructeur ne voit que les siennes.
export function isAdmin(user: LMSUser): boolean {
  return user.role === 'ADMIN';
}