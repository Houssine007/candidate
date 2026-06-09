import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not defined');
      return NextResponse.json(
        { error: 'Server configuration error: MongoDB URI is not set. Please create a .env.local file with MONGODB_URI.' },
        { status: 500 }
      );
    }

    // Connect to database
    try {
      await connectDB();
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: `Database connection failed: ${dbError.message}. Please check your MongoDB URI in .env.local` },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password, firstName, lastName, role } = body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists with this email' },
          { status: 400 }
        );
      }
    } catch (findError: any) {
      console.error('Find user error:', findError);
      return NextResponse.json(
        { error: 'Error checking user existence' },
        { status: 500 }
      );
    }

    // Validate role
    const validRoles = ['student', 'instructor', 'admin'];
    const userRole = role && validRoles.includes(role) ? role : 'student';

    // Create user
    let user;
    try {
      user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role: userRole,
      });
    } catch (createError: any) {
      console.error('User creation error:', createError);
      if (createError.code === 11000) {
        return NextResponse.json(
          { error: 'User already exists with this email' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: createError.message || 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate token
    let token;
    try {
      token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });
    } catch (tokenError: any) {
      console.error('Token generation error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate authentication token' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

