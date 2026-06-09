import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Module from '@/models/Module';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import Answer from '@/models/Answer';
import Course from '@/models/Course';
import jwt from 'jsonwebtoken';

// GET quiz for a module
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
    const moduleId = resolvedParams.id;

    const module = await Module.findById(moduleId).populate('quiz');
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify course belongs to instructor
    const course = await Course.findOne({ _id: module.courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!module.quiz) {
      return NextResponse.json({ quiz: null }, { status: 200 });
    }

    const quiz = await Quiz.findById(module.quiz).populate({
      path: 'questions',
      populate: {
        path: 'answers',
      },
    });

    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create or update quiz for a module
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
    const moduleId = resolvedParams.id;

    const module = await Module.findById(moduleId);
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify course belongs to instructor
    const course = await Course.findOne({ _id: module.courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, passingScore, timeLimit } = body;

    if (!title) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 });
    }

    let quiz;
    if (module.quiz) {
      // Check if quiz actually exists and update it
      const existingQuiz = await Quiz.findById(module.quiz);
      if (existingQuiz) {
        // Update existing quiz by modifying and saving
        console.log('Updating existing quiz:', module.quiz);
        existingQuiz.title = title;
        existingQuiz.description = description;
        existingQuiz.passingScore = passingScore || 60;
        existingQuiz.timeLimit = timeLimit;
        
        quiz = await existingQuiz.save();
        console.log('Updated quiz:', quiz ? 'Success' : 'Failed');
        
        if (!quiz) {
          console.error('Quiz save returned null. Quiz ID:', module.quiz);
          // Quiz save failed - create new one
          module.quiz = undefined;
          await module.save();
          quiz = null; // Force creation of new quiz
        } else {
          // Convert to plain object for JSON serialization
          quiz = quiz.toObject ? quiz.toObject() : JSON.parse(JSON.stringify(quiz));
        }
      } else {
        // Quiz ID exists in module but quiz doesn't exist in DB - create new one
        console.log('Quiz ID exists but quiz not found in DB. Creating new quiz.');
        module.quiz = undefined;
        await module.save();
        quiz = null; // Force creation of new quiz
      }
    }
    
    if (!quiz) {
      // Create new quiz (either module.quiz was null or quiz didn't exist)
      console.log('Creating new quiz for module:', moduleId);
      const newQuiz = new Quiz({
        title,
        description,
        moduleId: moduleId,
        isFinalExam: false,
        passingScore: passingScore || 60,
        timeLimit,
        questions: [],
        totalPoints: 0,
      });

      await newQuiz.save();
      console.log('Quiz saved with ID:', newQuiz._id);

      // Add quiz to module
      module.quiz = newQuiz._id;
      await module.save();
      console.log('Module updated with quiz ID:', module.quiz);
      
      // Convert to plain object for JSON serialization
      quiz = newQuiz.toObject ? newQuiz.toObject() : JSON.parse(JSON.stringify(newQuiz));
      console.log('Quiz converted to object:', quiz ? 'Success' : 'Failed');
    }

    console.log('Returning quiz:', quiz ? { id: quiz._id || quiz.id, title: quiz.title } : 'NULL');
    console.log('Quiz type:', typeof quiz, 'Is object:', quiz instanceof Object);
    
    // Ensure we return a plain object
    const quizObject = quiz ? (quiz.toObject ? quiz.toObject() : JSON.parse(JSON.stringify(quiz))) : null;
    
    return NextResponse.json({ quiz: quizObject }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating/updating quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE quiz for a module (and all its questions and answers)
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
    const moduleId = resolvedParams.id;

    const module = await Module.findById(moduleId);
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify course belongs to instructor
    const course = await Course.findOne({ _id: module.courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!module.quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const quiz = await Quiz.findById(module.quiz);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Delete all questions and their answers
    const questions = await Question.find({ quizId: quiz._id });
    for (const question of questions) {
      // Delete all answers for this question
      await Answer.deleteMany({ questionId: question._id });
      // Delete the question
      await Question.findByIdAndDelete(question._id);
    }

    // Remove quiz from module
    module.quiz = undefined;
    await module.save();

    // Delete the quiz
    await Quiz.findByIdAndDelete(quiz._id);

    return NextResponse.json({ message: 'Quiz and all its questions deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

