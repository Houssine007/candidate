import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import Module from '@/models/Module';
import jwt from 'jsonwebtoken';

// GET all modules for a course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
    if (decoded.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle both Promise and direct params for Next.js compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const courseId = resolvedParams.id;

    // Verify course belongs to instructor
    const course = await Course.findOne({ _id: courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const modules = await Module.find({ courseId: courseId })
      .populate('sections')
      .populate('quiz')
      .sort({ order: 1 });
    
    return NextResponse.json({ modules }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching modules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new module
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
    if (decoded.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle both Promise and direct params for Next.js compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const courseId = resolvedParams.id;

    // Verify course belongs to instructor
    const course = await Course.findOne({ _id: courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, order } = body;

    if (!title) {
      return NextResponse.json({ error: 'Module title is required' }, { status: 400 });
    }

    const moduleOrder = order !== undefined ? order : course.modules.length;

    const module = new Module({
      title,
      description,
      courseId: courseId,
      order: moduleOrder,
      sections: [],
    });

    await module.save();

    // Add module to course
    course.modules.push(module._id);
    await course.save();

    return NextResponse.json({ module }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating module:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

