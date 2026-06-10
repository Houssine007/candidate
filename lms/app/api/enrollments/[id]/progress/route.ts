import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';

// POST /api/enrollments/[id]/progress — enregistrer une progression
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const enrollment = await Enrollment.findById(params.id).populate('courseId');
    if (!enrollment) return NextResponse.json({ error: 'Enrollment non trouvé' }, { status: 404 });
    if (enrollment.employeeId !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { type, moduleId, sectionId, quizId, quizScore } = await req.json();

    // Démarrer automatiquement si premier progress
    if (enrollment.status === 'assigned') {
      enrollment.status = 'in_progress';
      enrollment.startedAt = new Date();
      await enrollment.save();
    }

    const progress = await Progress.create({
      enrollmentId: enrollment._id,
      employeeId: user.id,
      courseId: enrollment.courseId,
      moduleId,
      sectionId,
      quizId,
      type,
      quizScore,
      quizPassed: quizScore != null ? quizScore >= (enrollment.courseId as any).passingScore ?? 60 : undefined,
      completedAt: new Date(),
    });

    // Si cours complété : mettre à jour l'enrollment + notifier la plateforme RH
    if (type === 'course_completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      enrollment.finalScore = quizScore;
      await enrollment.save();

      // Appel au bridge FastAPI pour mettre à jour les compétences de l'employé
      const course = enrollment.courseId as any;
      if (course.skillId && course.skillLevel) {
        const RH_API = process.env.RH_API_URL || 'http://localhost:8000';
        const RH_SERVICE_TOKEN = process.env.RH_SERVICE_TOKEN || '';
        try {
          await fetch(`${RH_API}/api/lms/course-completed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RH_SERVICE_TOKEN}`,
            },
            body: JSON.stringify({
              employee_id: user.id,
              course_id: course._id.toString(),
              skill_id: course.skillId,
              skill_level: course.skillLevel,
              score: quizScore,
            }),
          });
        } catch (e) {
          console.error('RH bridge notification failed:', e);
        }
      }
    }

    return NextResponse.json(progress, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/enrollments/[id]/progress — liste la progression d'un enrollment
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const enrollment = await Enrollment.findById(params.id);
    if (!enrollment) return NextResponse.json({ error: 'Enrollment non trouvé' }, { status: 404 });
    if (enrollment.employeeId !== user.id && !['ADMIN', 'RECRUITER'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const progressItems = await Progress.find({ enrollmentId: params.id }).sort({ completedAt: 1 });
    return NextResponse.json(progressItems);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
