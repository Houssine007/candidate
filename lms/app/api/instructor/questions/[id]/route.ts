import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Quiz from '@/models/Quiz';
import Module from '@/models/Module';
import Course from '@/models/Course';
import jwt from 'jsonwebtoken';

// GET a single question
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

    const question = await Question.findById(questionId).populate('answers');
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

    return NextResponse.json({ question }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update a question
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
    const { question: questionText, type, order, points } = body;

    const updateData: any = {};
    if (questionText) updateData.question = questionText;
    if (type) updateData.type = type;
    if (order !== undefined) updateData.order = order;
    if (points !== undefined) updateData.points = points;

    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ question: updatedQuestion }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a question
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

    // Remove question from quiz
    quiz.questions = quiz.questions.filter((q: any) => q.toString() !== questionId);
    await quiz.save();

    // Delete all answers for this question
    const Answer = (await import('@/models/Answer')).default;
    await Answer.deleteMany({ questionId: questionId });

    await Question.findByIdAndDelete(questionId);

    return NextResponse.json({ message: 'Question deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

