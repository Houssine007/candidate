import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// SSO unifiée: valide le JWT RecruitPRO (FastAPI) et renvoie l'utilisateur.
// Compat: on expose role='instructor' quand is_instructor (ou ADMIN) pour que
// les pages /instructor existantes (qui testent role==='instructor') fonctionnent
// sans réécriture.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parts = (user.full_name || '').trim().split(/\s+/);
  const firstName = parts[0] || user.full_name || '';
  const lastName = parts.slice(1).join(' ');

  const isInstructor = user.is_instructor === true || user.role === 'ADMIN';

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      firstName,
      lastName,
      // rôle "applicatif" attendu par les pages LMS existantes
      role: isInstructor ? 'instructor' : user.role.toLowerCase(),
      rh_role: user.role,
      is_instructor: isInstructor,
      company_id: user.company_id,
    },
  }, { status: 200 });
}
