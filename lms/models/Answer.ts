import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer extends Document {
  answer: string;
  questionId: mongoose.Types.ObjectId;
  isCorrect: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    answer: {
      type: String,
      required: [true, 'Answer text is required'],
      trim: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Answer = mongoose.models.Answer || mongoose.model<IAnswer>('Answer', AnswerSchema);

export default Answer;

