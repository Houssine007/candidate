import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import Category from '@/models/Category';
import User from '@/models/User';

// GET all published courses (public endpoint)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = parseInt(searchParams.get('skip') || '0');
    const categoryId = searchParams.get('categoryId');

    // Build query
    const query: any = { status: 'published' };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const courses = await Course.find(query)
      .populate('categoryId', 'name')
      .populate('instructorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await Course.countDocuments(query);

    return NextResponse.json({ 
      courses,
      total,
      limit,
      skip
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching published courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

