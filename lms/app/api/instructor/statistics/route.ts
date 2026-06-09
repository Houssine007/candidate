import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const instructorId = decoded.userId;

    // Verify user is an instructor
    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total courses created by this instructor
    const totalCourses = await Course.countDocuments({ instructorId });

    // Get published courses count
    const publishedCourses = await Course.countDocuments({ 
      instructorId, 
      status: 'published' 
    });

    // For now, we'll set students and enrollments to 0
    // TODO: Implement enrollment system to track real students and enrollments
    const totalStudents = 0;
    const totalEnrollments = 0;

    return NextResponse.json({
      statistics: {
        totalCourses,
        publishedCourses,
        draftCourses: totalCourses - publishedCourses,
        totalStudents,
        totalEnrollments,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

