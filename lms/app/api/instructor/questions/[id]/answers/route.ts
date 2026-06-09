import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Answer from '@/models/Answer';
import Quiz from '@/models/Quiz';
import Module from '@/models/Module';
import Course from '@/models/Course';
import jwt from 'jsonwebtoken';

// GET all answers for a question
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
    const questionId = resolvedParams.id;

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const quiz = await Quiz.findById(question.quizId);
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

    const answers = await Answer.find({ questionId: questionId }).sort({ order: 1 });
    
    return NextResponse.json({ answers }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching answers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new answer
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
    const questionId = resolvedParams.id;

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const quiz = await Quiz.findById(question.quizId);
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
    const { answer, isCorrect, order } = body;

    if (!answer) {
      return NextResponse.json({ error: 'Answer text is required' }, { status: 400 });
    }

    const answerOrder = order !== undefined ? order : question.answers.length;

    const newAnswer = new Answer({
      answer,
      questionId: questionId,
      isCorrect: isCorrect || false,
      order: answerOrder,
    });

    await newAnswer.save();

    // Add answer to question
    question.answers.push(newAnswer._id);
    await question.save();

    return NextResponse.json({ answer: newAnswer }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

