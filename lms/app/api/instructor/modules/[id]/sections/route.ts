import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Module from '@/models/Module';
import Section from '@/models/Section';
import Course from '@/models/Course';
import jwt from 'jsonwebtoken';

// GET all sections for a module
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
    if (decoded.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle both Promise and direct params for Next.js compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const moduleId = resolvedParams.id;

    const module = await Module.findById(moduleId);
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify course belongs to instructor
    const course = await Course.findOne({ _id: module.courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sections = await Section.find({ moduleId: moduleId }).sort({ order: 1 });
    
    return NextResponse.json({ sections }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new section
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
    if (decoded.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle both Promise and direct params for Next.js compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const moduleId = resolvedParams.id;

    const module = await Module.findById(moduleId);
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify course belongs to instructor
    const course = await Course.findOne({ _id: module.courseId, instructorId: decoded.userId });
    if (!course) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, type, order, fileUrl, fileName, fileType, youtubeUrl } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 });
    }

    if (type === 'file' && (!fileUrl || !fileType)) {
      return NextResponse.json({ error: 'File URL and file type are required for file sections' }, { status: 400 });
    }

    if (type === 'youtube' && !youtubeUrl) {
      return NextResponse.json({ error: 'YouTube URL is required for youtube sections' }, { status: 400 });
    }

    const sectionOrder = order !== undefined ? order : module.sections.length;

    const section = new Section({
      title,
      description,
      moduleId: moduleId,
      type,
      order: sectionOrder,
      fileUrl: type === 'file' ? fileUrl : undefined,
      fileName: type === 'file' ? fileName : undefined,
      fileType: type === 'file' ? fileType : undefined,
      youtubeUrl: type === 'youtube' ? youtubeUrl : undefined,
    });

    await section.save();

    // Add section to module
    module.sections.push(section._id);
    await module.save();

    return NextResponse.json({ section }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

