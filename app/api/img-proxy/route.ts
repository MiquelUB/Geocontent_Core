import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Only allow Supabase storage URLs for security
    if (!url.startsWith('https://wlxaqpujfktxdmqsfvqp.supabase.co/storage/')) {
        return new NextResponse('Unauthorized URL', { status: 403 });
    }

    try {
        const response = await fetch(url, { cache: 'force-cache' });

        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const imageBuffer = await response.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('[img-proxy] Error:', error);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
