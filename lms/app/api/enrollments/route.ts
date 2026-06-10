import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireRole, requireAuth } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

// POST /api/enrollments — RH/Admin assigne un cours à un employé
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN', 'RECRUITER']);
    const { employeeId, courseId } = await req.json();

    if (!employeeId || !courseId) {
      return NextResponse.json({ error: 'employeeId et courseId requis' }, { status: 400 });
    }

    await connectDB();

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 });
    }

    // Vérification isolation company
    if (course.companyId && user.company_id && course.companyId !== user.company_id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const enrollment = await Enrollment.create({
      employeeId,
      courseId,
      assignedBy: user.id,
      status: 'assigned',
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (err.code === 11000) return NextResponse.json({ error: 'Cet employé est déjà inscrit à ce cours' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/enrollments — liste toutes les inscriptions (admin/recruteur)
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN', 'RECRUITER']);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const courseId = searchParams.get('courseId');

    await connectDB();

    const filter: Record<string, any> = {};
    if (employeeId) filter.employeeId = parseInt(employeeId);
    if (courseId) filter.courseId = courseId;

    const enrollments = await Enrollment.find(filter)
      .populate('courseId', 'title thumbnail skillId skillLevel status')
      .sort({ createdAt: -1 });

    return NextResponse.json(enrollments);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}