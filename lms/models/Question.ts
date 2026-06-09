import mongoose, { Document, Schema } from 'mongoose';

export type QuestionType = 'qcm' | 'true_false' | 'multiple_correct';

export interface IQuestion extends Document {
  question: string;
  type: QuestionType;
  quizId: mongoose.Types.ObjectId;
  order: number;
  points: number;
  answers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['qcm', 'true_false', 'multiple_correct'],
      required: true,
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    points: {
      type: Number,
      required: true,
      default: 1,
    },
    answers: [{
      type: Schema.Types.ObjectId,
      ref: 'Answer',
    }],
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;

