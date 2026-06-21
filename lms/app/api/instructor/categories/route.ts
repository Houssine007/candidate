import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { authorizeInstructor } from '@/lib/auth';

// GET all categories for the instructor
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;
    const user = auth.user;

    const categories = await Category.find({ instructorId: user.id }).sort({ createdAt: -1 });
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new category
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;
    const user = auth.user;

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = new Category({
      name,
      description,
      instructorId: user.id,
    });

    await category.save();
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

