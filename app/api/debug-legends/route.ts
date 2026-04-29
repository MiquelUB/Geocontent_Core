import { NextResponse } from 'next/server';
import { getLegends } from '@/lib/actions/queries';

export async function GET() {
    const data = await getLegends();
    return NextResponse.json(data);
}
