import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import Module from '@/models/Module';
import Course from '@/models/Course';
import jwt from 'jsonwebtoken';

// GET all questions for a quiz
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
    const quizId = resolvedParams.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Verify ownership
    if (quiz.moduleId) {
      const module = await Module.findById(quiz.moduleId);
      if (module) {
        const course = await Course.findOne({ _id: module.courseId, instructorId: decoded.userId });
        if (!course) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    } else if (quiz.courseId) {
      const course = await Course.findOne({ _id: quiz.courseId, instructorId: decoded.userId });
      if (!course) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const questions = await Question.find({ quizId: quizId })
      .populate('answers')
      .sort({ order: 1 });
    
    return NextResponse.json({ questions }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new question
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
    const quizId = resolvedParams.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Verify ownership
    if (quiz.moduleId) {
      const module = await Module.findById(quiz.moduleId);
      if (module) {
        const course = await Course.findOne({ _id: module.courseId, instructorId: decoded.userId });
        if (!course) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    } else if (quiz.courseId) {
      const course = await Course.findOne({ _id: quiz.courseId, instructorId: decoded.userId });
      if (!course) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { question, type, order, points } = body;

    if (!question || !type) {
      return NextResponse.json({ error: 'Question text and type are required' }, { status: 400 });
    }

    if (!['qcm', 'true_false', 'multiple_correct'].includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    const questionOrder = order !== undefined ? order : quiz.questions.length;

    const newQuestion = new Question({
      question,
      type,
      quizId: quizId,
      order: questionOrder,
      points: points || 1,
      answers: [],
    });

    await newQuestion.save();

    // Add question to quiz
    quiz.questions.push(newQuestion._id);
    await quiz.save();

    return NextResponse.json({ question: newQuestion }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

