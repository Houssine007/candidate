import mongoose, { Document, Schema } from 'mongoose';

export interface IProgress extends Document {
  enrollmentId: mongoose.Types.ObjectId;
  employeeId: number;          // dénormalisé pour requêtes rapides
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  quizId?: mongoose.Types.ObjectId;
  type: 'section_viewed' | 'quiz_completed' | 'module_completed' | 'course_completed';
  quizScore?: number;          // Score obtenu au quiz (0-100)
  quizPassed?: boolean;
  completedAt: Date;
  createdAt: Date;
}

const ProgressSchema = new Schema<IProgress>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
    },
    employeeId: {
      type: Number,
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
    },
    type: {
      type: String,
      enum: ['section_viewed', 'quiz_completed', 'module_completed', 'course_completed'],
      required: true,
    },
    quizScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    quizPassed: {
      type: Boolean,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Progress = mongoose.models.Progress || mongoose.model<IProgress>('Progress', ProgressSchema);

export default Progress;