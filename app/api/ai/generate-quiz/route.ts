import { NextResponse } from 'next/server';
import { generatePoiQuiz } from '@/lib/services/openrouter';

export async function POST(req: Request) {
    try {
        const { title, content, type } = await req.json();

        if (!content) {
            return NextResponse.json({ success: false, error: "No hi ha contingut per generar el quiz." }, { status: 400 });
        }

        const quiz = await generatePoiQuiz(title, content, type || 'CIVIL');

        if (!quiz) {
            return NextResponse.json({ success: false, error: "Error generant el quiz AI." }, { status: 500 });
        }

        return NextResponse.json({ success: true, quiz });
    } catch (error: any) {
        console.error("AI Quiz Route Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
