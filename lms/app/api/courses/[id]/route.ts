import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import Course from '@/models/Course';
import Module from '@/models/Module';
import '@/models/Section';
import Quiz from '@/models/Quiz';
import '@/models/Question';
import '@/models/Answer';
import '@/models/Category';

// GET /api/courses/[id] — contenu d'un cours pour un apprenant authentifié.
// Renvoie les modules → sections et l'examen final, MAIS expurgé des bonnes
// réponses (isCorrect) pour que la correction reste côté serveur.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAuth(req);
    await connectDB();
    const { id } = params instanceof Promise ? await params : params;

    const course: any = await Course.findOne({ _id: id, status: 'published' })
      .populate('categoryId', 'name')
      .lean();
    if (!course) return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 });

    const modules = await Module.find({ courseId: id })
      .populate({ path: 'sections', options: { sort: { order: 1 } } })
      .sort({ order: 1 })
      .lean();

    // Examen final — questions et réponses SANS le flag isCorrect
    let finalExam: any = null;
    if (course.finalExam) {
      const quiz: any = await Quiz.findById(course.finalExam)
        .populate({
          path: 'questions',
          options: { sort: { order: 1 } },
          populate: { path: 'answers', options: { sort: { order: 1 } } },
        })
        .lean();
      if (quiz) {
        finalExam = {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          passingScore: quiz.passingScore ?? 60,
          timeLimit: quiz.timeLimit,
          questions: (quiz.questions || []).map((q: any) => ({
            _id: q._id,
            question: q.question,
            type: q.type,
            points: q.points,
            answers: (q.answers || []).map((a: any) => ({ _id: a._id, answer: a.answer })),
          })),
        };
      }
    }

    return NextResponse.json({ course: { ...course, modules, finalExam } }, { status: 200 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (err.name === 'CastError') return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
    console.error('Error fetching course content:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
