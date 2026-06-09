import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
  title: string;
  description?: string;
  moduleId?: mongoose.Types.ObjectId; // For module quiz
  courseId?: mongoose.Types.ObjectId; // For final exam
  isFinalExam: boolean;
  questions: mongoose.Types.ObjectId[];
  totalPoints: number;
  passingScore: number;
  timeLimit?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    isFinalExam: {
      type: Boolean,
      default: false,
    },
    questions: [{
      type: Schema.Types.ObjectId,
      ref: 'Question',
    }],
    totalPoints: {
      type: Number,
      default: 0,
    },
    passingScore: {
      type: Number,
      default: 60, // 60%
    },
    timeLimit: {
      type: Number, // in minutes
    },
  },
  {
    timestamps: true,
  }
);

const Quiz = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);

export default Quiz;

