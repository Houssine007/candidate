import mongoose, { Document, Schema } from 'mongoose';

export type SectionType = 'file' | 'youtube';

export interface ISection extends Document {
  title: string;
  description?: string;
  moduleId: mongoose.Types.ObjectId;
  type: SectionType;
  order: number;
  // For file type
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'word' | 'ppt';
  // For youtube type
  youtubeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    type: {
      type: String,
      enum: ['file', 'youtube'],
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'word', 'ppt'],
    },
    youtubeUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Section = mongoose.models.Section || mongoose.model<ISection>('Section', SectionSchema);

export default Section;

