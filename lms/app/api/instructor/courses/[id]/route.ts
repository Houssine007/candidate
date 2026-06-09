import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

// Import models in correct order to ensure schemas are registered
import Category from '@/models/Category';
import Section from '@/models/Section';
import Module from '@/models/Module';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import Answer from '@/models/Answer';
import Course from '@/models/Course';

// GET a single course with modules
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

    // Ensure all models are registered by importing them
    // This ensures Mongoose knows about the schemas before populate
    void Module;
    void Section;
    void Quiz;

    const course = await Course.findOne({ _id: courseId, instructorId: decoded.userId })
      .populate('categoryId', 'name')
      .lean();
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Load modules with sections separately
    const modules = await Module.find({ courseId: courseId })
      .populate('sections')
      .populate('quiz')
      .sort({ order: 1 })
      .lean();

    // Load final exam if exists
    let finalExam = null;
    if (course.finalExam) {
      finalExam = await Quiz.findById(course.finalExam)
        .populate('questions')
        .lean();
    }

    // Combine course data with modules and final exam
    const courseWithModules = {
      ...course,
      modules,
      finalExam,
    };

    return NextResponse.json({ course: courseWithModules }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching course:', error);
    if (error.name === 'CastError') {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update a course
export async function PUT(
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

    const body = await request.json();
    const { title, description, categoryId, price, thumbnail, status } = body;

    // Verify category if provided
    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, instructorId: decoded.userId });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (categoryId) updateData.categoryId = categoryId;
    if (price !== undefined) updateData.price = price;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (status) updateData.status = status;

    const course = await Course.findOneAndUpdate(
      { _id: courseId, instructorId: decoded.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ course }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a course
export async function DELETE(
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

    const course = await Course.findOneAndDelete({ _id: courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Course deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

