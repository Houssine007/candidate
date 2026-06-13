import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import { requireRole } from '@/lib/auth';

// GET /api/enrollments?employeeId=123  -> inscriptions d'un employé (RH/Admin)
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['ADMIN', 'RECRUITER']);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const query: any = {};
    if (employeeId) query.employeeId = parseInt(employeeId);

    const enrollments = await Enrollment.find(query)
      .populate('courseId')
      .sort({ assignedAt: -1 })
      .lean();

    return NextResponse.json({ enrollments }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/enrollments  { employeeId, courseId }  -> assigner un cours (RH/Admin)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['ADMIN', 'RECRUITER']);
    await connectDB();

    const body = await request.json();
    const employeeId = body.employeeId ?? body.employee_id;
    const courseId = body.courseId ?? body.course_id;

    if (employeeId == null || !courseId) {
      return NextResponse.json({ error: 'employeeId et courseId sont requis' }, { status: 400 });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });
    }

    const existing = await Enrollment.findOne({ employeeId: parseInt(employeeId), courseId });
    if (existing) {
      const populated = await existing.populate('courseId');
      return NextResponse.json({ enrollment: populated }, { status: 200 });
    }

    const enrollment = new Enrollment({
      employeeId: parseInt(employeeId),
      courseId,
      assignedBy: user.id,
      status: 'assigned',
    });
    await enrollment.save();
    const populated = await enrollment.populate('courseId');

    return NextResponse.json({ enrollment: populated }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    console.error('Error assigning course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}