import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_RH_URL || 'http://localhost:3000';

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }
  const response = NextResponse.next();
  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export const config = { matcher: '/api/:path*' };