import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { authorizeInstructor } from '@/lib/auth';

// GET a single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;
    const user = auth.user;
    const { id } = params instanceof Promise ? await params : params;

    const category = await Category.findOne({ _id: id, instructorId: user.id });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;
    const user = auth.user;
    const { id } = params instanceof Promise ? await params : params;

    const body = await request.json();
    const { name, description } = body;

    const category = await Category.findOneAndUpdate(
      { _id: id, instructorId: user.id },
      { name, description },
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;
    const user = auth.user;
    const { id } = params instanceof Promise ? await params : params;

    const category = await Category.findOneAndDelete({ _id: id, instructorId: user.id });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

