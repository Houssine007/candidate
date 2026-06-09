import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  employeeId: number;          // ID PostgreSQL de l'employé (plateforme RH)
  courseId: mongoose.Types.ObjectId;
  assignedBy?: number;         // ID PostgreSQL du RH/manager qui a assigné
  status: 'assigned' | 'in_progress' | 'completed' | 'abandoned';
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  finalScore?: number;         // Score final du quiz de fin de cours (0-100)
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
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
    assignedBy: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed', 'abandoned'],
      default: 'assigned',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    finalScore: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Un employé ne peut être inscrit qu'une seule fois par cours
EnrollmentSchema.index({ employeeId: 1, courseId: 1 }, { unique: true });

const Enrollment = mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

export default Enrollment;