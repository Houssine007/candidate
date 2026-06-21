import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import Category from '@/models/Category';
import { authorizeInstructor, isAdmin } from '@/lib/auth';

// GET all courses for the instructor
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;
    const user = auth.user;

    // Un ADMIN voit tous les cours ; un instructeur uniquement les siens.
    const filter = isAdmin(user) ? {} : { instructorId: user.id };
    const courses = await Course.find(filter)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ courses }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new course
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;
    const user = auth.user;

    const body = await request.json();
    const { title, description, categoryId, price, thumbnail, status, skillId, skillLevel, companyId } = body;

    if (!title || !description || !categoryId) {
      return NextResponse.json({ error: 'Title, description, and category are required' }, { status: 400 });
    }

    // La catégorie doit appartenir à l'instructeur (ou l'utilisateur est ADMIN).
    const categoryFilter = isAdmin(user)
      ? { _id: categoryId }
      : { _id: categoryId, instructorId: user.id };
    const category = await Category.findOne(categoryFilter);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const course = new Course({
      title,
      description,
      categoryId,
      instructorId: user.id,
      instructorName: user.full_name,
      price: price || 0,
      thumbnail,
      status: status || 'draft',
      modules: [],
      // Liaison plateforme RH (référence inter-services vers Postgres)
      ...(skillId != null && { skillId }),
      ...(skillLevel != null && { skillLevel }),
      ...(companyId != null && { companyId }),
    });

    await course.save();
    return NextResponse.json({ course }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
