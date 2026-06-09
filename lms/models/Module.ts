import mongoose, { Document, Schema } from 'mongoose';

export interface IModule extends Document {
  title: string;
  description?: string;
  courseId: mongoose.Types.ObjectId;
  order: number;
  sections: mongoose.Types.ObjectId[];
  quiz?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema = new Schema<IModule>(
  {
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    sections: [{
      type: Schema.Types.ObjectId,
      ref: 'Section',
    }],
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
    },
  },
  {
    timestamps: true,
  }
);

const Module = mongoose.models.Module || mongoose.model<IModule>('Module', ModuleSchema);

export default Module;

