import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';

// POST /api/enrollments/[id]/progress — enregistrer une progression
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const { id } = params instanceof Promise ? await params : params;
    const enrollment = await Enrollment.findById(id).populate({
      path: 'courseId',
      populate: { path: 'finalExam', select: 'passingScore' },
    });
    if (!enrollment) return NextResponse.json({ error: 'Enrollment non trouvé' }, { status: 404 });
    if (enrollment.employeeId !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { type, moduleId, sectionId, quizId, quizScore } = await req.json();

    // Démarrer automatiquement si premier progress
    if (enrollment.status === 'assigned') {
      enrollment.status = 'in_progress';
      enrollment.startedAt = new Date();
      await enrollment.save();
    }

    const course = enrollment.courseId as any;
    // Seuil de réussite porté par l'examen final du cours (défaut 60 %)
    const passingScore = course?.finalExam?.passingScore ?? 60;
    const hasExam = !!course?.finalExam;
    const quizPassed = quizScore != null ? quizScore >= passingScore : undefined;

    const progress = await Progress.create({
      enrollmentId: enrollment._id,
      employeeId: user.id,
      courseId: enrollment.courseId,
      moduleId,
      sectionId,
      quizId,
      type,
      quizScore,
      quizPassed,
      completedAt: new Date(),
    });

    // Si cours complété : mettre à jour l'enrollment + notifier la plateforme RH
    if (type === 'course_completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      enrollment.finalScore = quizScore;
      await enrollment.save();

      // La compétence n'est validée (et remontée vers la plateforme RH) QUE si
      // l'évaluation finale est réussie. Un cours sans examen final est validé
      // par son achèvement. C'est la preuve d'acquisition qui conditionne la
      // mise à jour du référentiel de compétences.
      const competenceValidated = hasExam
        ? quizScore != null && quizScore >= passingScore
        : true;

      if (course.skillId && course.skillLevel && competenceValidated) {
        const RH_API = process.env.RH_API_URL || 'http://localhost:8000';
        // On relaie le jeton de l'apprenant lui-même : le bridge RH autorise un
        // employé à mettre à jour SA propre compétence (ou un service ADMIN).
        // Évite de dépendre d'un RH_SERVICE_TOKEN statique non configuré.
        const bridgeAuth =
          req.headers.get('Authorization') ||
          (process.env.RH_SERVICE_TOKEN ? `Bearer ${process.env.RH_SERVICE_TOKEN}` : '');
        try {
          await fetch(`${RH_API}/api/lms/course-completed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: bridgeAuth,
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
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const { id } = params instanceof Promise ? await params : params;
    const enrollment = await Enrollment.findById(id);
    if (!enrollment) return NextResponse.json({ error: 'Enrollment non trouvé' }, { status: 404 });
    if (enrollment.employeeId !== user.id && !['ADMIN', 'RECRUITER'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const progressItems = await Progress.find({ enrollmentId: id }).sort({ completedAt: 1 });
    return NextResponse.json(progressItems);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
