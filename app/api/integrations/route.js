import { NextResponse } from 'next/server';
import { integrationStatus } from '../../../lib/integrations.js';

export const dynamic = 'force-dynamic';

// คืนค่า boolean เท่านั้น จึงไม่ต้องตรวจสิทธิ์
export async function GET() {
  return NextResponse.json(integrationStatus());
}
