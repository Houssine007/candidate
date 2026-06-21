import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';
import Quiz from '@/models/Quiz';
import '@/models/Question';
import '@/models/Answer';
import '@/models/Course';

// POST /api/enrollments/[id]/submit-exam
// Body: { answers: { [questionId]: answerId | answerId[] } }
// Corrige l'examen final CÔTÉ SERVEUR (les bonnes réponses ne quittent jamais
// le backend), finalise l'inscription et — si réussi — déclenche la mise à jour
// de la compétence (boucle vivante) via le bridge RH.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth(req);
    await connectDB();
    const { id } = params instanceof Promise ? await params : params;

    const enrollment = await Enrollment.findById(id).populate('courseId');
    if (!enrollment) return NextResponse.json({ error: 'Inscription non trouvée' }, { status: 404 });
    if (enrollment.employeeId !== user.id && !['ADMIN', 'RECRUITER'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const course: any = enrollment.courseId;
    if (!course?.finalExam) {
      return NextResponse.json({ error: "Ce cours n'a pas d'examen final" }, { status: 400 });
    }

    const quiz: any = await Quiz.findById(course.finalExam)
      .populate({ path: 'questions', populate: { path: 'answers' } })
      .lean();
    if (!quiz) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });

    const { answers } = await req.json();
    const submitted: Record<string, any> = answers || {};

    let earned = 0;
    let total = 0;
    let correctCount = 0;
    const questions = quiz.questions || [];

    for (const q of questions) {
      const points = q.points || 1;
      total += points;
      const correctIds = (q.answers || [])
        .filter((a: any) => a.isCorrect)
        .map((a: any) => String(a._id))
        .sort();
      const raw = submitted[String(q._id)];
      const subIds = (Array.isArray(raw) ? raw : raw != null ? [raw] : [])
        .map(String)
        .sort();
      const ok =
        correctIds.length > 0 &&
        correctIds.length === subIds.length &&
        correctIds.every((c: string, i: number) => c === subIds[i]);
      if (ok) {
        earned += points;
        correctCount++;
      }
    }

    const score = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passingScore = quiz.passingScore ?? 60;
    const passed = score >= passingScore;

    // Finalisation de l'inscription (l'examen a été passé, quel que soit le résultat)
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    if (!enrollment.startedAt) enrollment.startedAt = new Date();
    enrollment.finalScore = score;
    await enrollment.save();

    // Boucle vivante : la compétence n'est validée QUE si l'examen est réussi.
    let skillValidated = false;
    if (passed && course.skillId && course.skillLevel) {
      const RH_API = process.env.RH_API_URL || 'http://localhost:8000';
      const bridgeAuth =
        req.headers.get('Authorization') ||
        (process.env.RH_SERVICE_TOKEN ? `Bearer ${process.env.RH_SERVICE_TOKEN}` : '');
      try {
        const r = await fetch(`${RH_API}/api/lms/course-completed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: bridgeAuth },
          body: JSON.stringify({
            employee_id: user.id,
            course_id: String(course._id),
            skill_id: course.skillId,
            skill_level: course.skillLevel,
            score,
          }),
        });
        skillValidated = r.ok;
      } catch (e) {
        console.error('RH bridge notification failed:', e);
      }
    }

    return NextResponse.json(
      {
        score,
        passed,
        passingScore,
        totalQuestions: questions.length,
        correctCount,
        skillValidated,
        skillLevel: passed ? course.skillLevel : undefined,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    console.error('Error submitting exam:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
