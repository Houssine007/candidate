import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { authorizeInstructor } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeInstructor(request);
    if (!auth.ok) return auth.res;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const fileType = file.type;
    
    // Check if file type is allowed
    const isValidType = allowedTypes.includes(fileType) || 
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.doc') ||
      file.name.toLowerCase().endsWith('.docx') ||
      file.name.toLowerCase().endsWith('.ppt') ||
      file.name.toLowerCase().endsWith('.pptx');

    if (!isValidType) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, Word, and PowerPoint files are allowed.' }, { status: 400 });
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    
    // Save file to public/uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filepath = join(uploadsDir, filename);

    // Create uploads directory if it doesn't exist
    try {
      await writeFile(filepath, buffer);
    } catch (error: any) {
      // If directory doesn't exist, create it
      if (error.code === 'ENOENT') {
        const { mkdir } = require('fs/promises');
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(filepath, buffer);
      } else {
        throw error;
      }
    }

    // Return the public URL
    const fileUrl = `/uploads/${filename}`;
    
    return NextResponse.json({ 
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

