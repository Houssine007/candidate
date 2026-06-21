import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  instructorId: number;          // ID PostgreSQL de l'instructeur (plateforme RH)
  instructorName?: string;       // dénormalisé pour l'affichage sans appel RH
  price?: number;
  thumbnail?: string;
  status: 'draft' | 'published';
  modules: mongoose.Types.ObjectId[];
  finalExam?: mongoose.Types.ObjectId;
  skillId?: number;            // ID PostgreSQL de la compétence validée (plateforme RH)
  skillLevel?: number;         // Niveau de compétence validé à l'issue du cours (1-4)
  companyId?: number;          // ID PostgreSQL de l'entreprise propriétaire
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    instructorId: {
      type: Number,
      required: true,
      index: true,
    },
    instructorName: {
      type: String,
    },
    price: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    modules: [{
      type: Schema.Types.ObjectId,
      ref: 'Module',
    }],
    finalExam: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
    },
    skillId: {
      type: Number,
      index: true,
    },
    skillLevel: {
      type: Number,
      min: 1,
      max: 4,
    },
    companyId: {
      type: Number,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);

export default Course;

