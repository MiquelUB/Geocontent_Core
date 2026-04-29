import { NextResponse } from 'next/server';
import { updateMunicipality } from '@/lib/actions';
import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/database/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // 1. Validació Estricta d'Autenticació i Autorització (RBAC)
    const supabase = createClient(await cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "No autoritzat. Sessió invàlida o inexistent." }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Permisos insuficients. Requereix rol d'administrador." }, { status: 403 });
    }

    // 2. Processament de les dades
    const body = await req.json();
    const { id, name, logoUrl, themeId, adminMasterPassword, planTier, extraRoutesCount } = body;

    // Strict Validation for Audit TC002
    if (!id || !name) {
      return NextResponse.json({
        success: false,
        error: "Manquen camps obligatoris (ID o Nom)."
      }, { status: 400 });
    }

    // 3. Execució de la mutació
    const res = await updateMunicipality(id, name, logoUrl, themeId, adminMasterPassword, planTier, extraRoutesCount);
    return NextResponse.json(res);
    
  } catch (err: any) {
    // 4. Emmascarament de l'error per evitar fuites d'informació
    console.error("[API CRITICAL ERROR] /api/admin/municipality:", err.message);
    return NextResponse.json({ success: false, error: "S'ha produït un error intern al servidor." }, { status: 500 });
  }
}
