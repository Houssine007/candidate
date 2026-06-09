import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Answer from '@/models/Answer';
import Question from '@/models/Question';
import Quiz from '@/models/Quiz';
import Module from '@/models/Module';
import Course from '@/models/Course';
import jwt from 'jsonwebtoken';

// PUT update an answer
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
    const answerId = resolvedParams.id;

    const answer = await Answer.findById(answerId);
    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    const question = await Question.findById(answer.questionId);
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
    const { answer: answerText, isCorrect, order } = body;

    const updateData: any = {};
    if (answerText) updateData.answer = answerText;
    if (isCorrect !== undefined) updateData.isCorrect = isCorrect;
    if (order !== undefined) updateData.order = order;

    const updatedAnswer = await Answer.findByIdAndUpdate(
      answerId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ answer: updatedAnswer }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE an answer
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
    const answerId = resolvedParams.id;

    const answer = await Answer.findById(answerId);
    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    const question = await Question.findById(answer.questionId);
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

    // Remove answer from question
    question.answers = question.answers.filter((a: any) => a.toString() !== answerId);
    await question.save();

    await Answer.findByIdAndDelete(answerId);

    return NextResponse.json({ message: 'Answer deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

