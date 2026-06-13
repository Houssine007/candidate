import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  instructorId: number;          // ID PostgreSQL de l'utilisateur formateur (plateforme RH)
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    instructorId: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;

