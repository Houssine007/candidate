import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';

// GET /api/enrollments/me — employé voit ses formations assignées avec progression
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const enrollments = await Enrollment.find({ employeeId: user.id })
      .populate({
        path: 'courseId',
        select: 'title description thumbnail skillId skillLevel modules finalExam categoryId',
        populate: { path: 'modules', select: 'title order' }
      })
      .sort({ assignedAt: -1 });

    // Enrichir avec la progression de chaque enrollment
    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const progressItems = await Progress.find({ enrollmentId: e._id });
        const completedSections = progressItems.filter(p => p.type === 'section_viewed').length;
        const completedModules = progressItems.filter(p => p.type === 'module_completed').length;
        const quizResults = progressItems.filter(p => p.type === 'quiz_completed');

        return {
          ...e.toObject(),
          progress: {
            completedSections,
            completedModules,
            quizResults: quizResults.map(q => ({
              quizId: q.quizId,
              score: q.quizScore,
              passed: q.quizPassed,
              completedAt: q.completedAt,
            })),
          },
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}