import { NextResponse } from 'next/server';
import { createClient } from '@/lib/database/supabase/server';

/**
 * GET /api/municipality — Fetch branding info by ID
 * Used as a fallback for client-side components if not provided as props
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: "Missing municipality ID" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: brand, error } = await supabase
            .from('municipalities')
            .select('name, logo_url, theme_id')
            .eq('id', id)
            .single();

        if (error || !brand) {
            // Return 200 with null or error so UI can handle it gracefully instead of 404
            return NextResponse.json({ success: false, error: "Municipality not found" }, { status: 404 });
        }

        return NextResponse.json({
            name: brand.name,
            logoUrl: brand.logo_url,
            themeId: brand.theme_id
        });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
