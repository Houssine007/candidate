import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, requireRole } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';

// PATCH /api/enrollments/[id] — mise à jour du statut
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const { id } = params instanceof Promise ? await params : params;
    const enrollment = await Enrollment.findById(id);
    if (!enrollment) return NextResponse.json({ error: 'Enrollment non trouvé' }, { status: 404 });

    // L'employé ne peut modifier que son propre enrollment
    if (enrollment.employeeId !== user.id && !['ADMIN', 'RECRUITER'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { status } = await req.json();
    const allowedTransitions: Record<string, string[]> = {
      assigned: ['in_progress', 'abandoned'],
      in_progress: ['completed', 'abandoned'],
      completed: [],
      abandoned: ['assigned'],
    };

    if (!allowedTransitions[enrollment.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Transition ${enrollment.status} → ${status} non autorisée` },
        { status: 400 }
      );
    }

    enrollment.status = status;
    if (status === 'in_progress' && !enrollment.startedAt) enrollment.startedAt = new Date();
    if (status === 'completed') enrollment.completedAt = new Date();

    await enrollment.save();
    return NextResponse.json(enrollment);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/enrollments/[id] — détail d'un enrollment
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const { id } = params instanceof Promise ? await params : params;
    const enrollment = await Enrollment.findById(id).populate('courseId');
    if (!enrollment) return NextResponse.json({ error: 'Enrollment non trouvé' }, { status: 404 });

    if (enrollment.employeeId !== user.id && !['ADMIN', 'RECRUITER'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return NextResponse.json(enrollment);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
