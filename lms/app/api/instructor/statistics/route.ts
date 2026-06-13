import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // SSO unifiée: token JWT de la plateforme RH (FastAPI)
    const user = await requireRole(request, ['ADMIN', 'RECRUITER']);
    await connectDB();

    // Filtrer par entreprise de l'utilisateur si disponible
    const filter = user.company_id ? { companyId: user.company_id } : {};

    const totalCourses = await Course.countDocuments(filter);
    const publishedCourses = await Course.countDocuments({ ...filter, status: 'published' });
    const totalEnrollments = await Enrollment.countDocuments();
    const completedEnrollments = await Enrollment.countDocuments({ status: 'completed' });

    return NextResponse.json({
      statistics: {
        totalCourses,
        publishedCourses,
        draftCourses: totalCourses - publishedCourses,
        totalEnrollments,
        completedEnrollments,
      },
    }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}