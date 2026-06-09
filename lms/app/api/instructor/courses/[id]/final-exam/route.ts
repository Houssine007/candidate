import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import Answer from '@/models/Answer';
import jwt from 'jsonwebtoken';

// GET final exam for a course
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

    const resolvedParams = params instanceof Promise ? await params : params;
    const course = await Course.findOne({ _id: resolvedParams.id, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.finalExam) {
      return NextResponse.json({ quiz: null }, { status: 200 });
    }

    const quiz = await Quiz.findById(course.finalExam).populate({
      path: 'questions',
      populate: {
        path: 'answers',
      },
    });

    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching final exam:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create or update final exam for a course
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

    const resolvedParams = params instanceof Promise ? await params : params;
    const course = await Course.findOne({ _id: resolvedParams.id, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, passingScore, timeLimit } = body;

    if (!title) {
      return NextResponse.json({ error: 'Exam title is required' }, { status: 400 });
    }

    let quiz;
    if (course.finalExam) {
      // Update existing exam
      quiz = await Quiz.findByIdAndUpdate(
        course.finalExam,
        {
          title,
          description,
          passingScore: passingScore || 60,
          timeLimit,
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new exam
      quiz = new Quiz({
        title,
        description,
        courseId: resolvedParams.id,
        isFinalExam: true,
        passingScore: passingScore || 60,
        timeLimit,
        questions: [],
        totalPoints: 0,
      });

      await quiz.save();

      // Add exam to course
      course.finalExam = quiz._id;
      await course.save();
    }

    // Convert to plain object for JSON serialization
    const quizObject = quiz ? (quiz.toObject ? quiz.toObject() : JSON.parse(JSON.stringify(quiz))) : null;
    
    return NextResponse.json({ quiz: quizObject }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating/updating final exam:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE final exam for a course (and all its questions and answers)
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

    const resolvedParams = params instanceof Promise ? await params : params;
    const course = await Course.findOne({ _id: resolvedParams.id, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.finalExam) {
      return NextResponse.json({ error: 'Final exam not found' }, { status: 404 });
    }

    const quiz = await Quiz.findById(course.finalExam);
    if (!quiz) {
      return NextResponse.json({ error: 'Final exam not found' }, { status: 404 });
    }

    // Delete all questions and their answers
    const questions = await Question.find({ quizId: quiz._id });
    for (const question of questions) {
      // Delete all answers for this question
      await Answer.deleteMany({ questionId: question._id });
      // Delete the question
      await Question.findByIdAndDelete(question._id);
    }

    // Remove exam from course
    course.finalExam = undefined;
    await course.save();

    // Delete the exam
    await Quiz.findByIdAndDelete(quiz._id);

    return NextResponse.json({ message: 'Final exam and all its questions deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting final exam:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

