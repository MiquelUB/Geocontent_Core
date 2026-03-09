
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function deleteUsers() {
    console.log('--- Iniciant esborrat d\'usuaris de prova (Auth) ---')

    // 1. Obtenir tots els usuaris
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
        console.error('Error llistant usuaris:', listError)
        return
    }

    console.log(`S'han trobat ${users.length} usuaris a Supabase Auth.`)

    // 2. Iterar i esborrar (mantenint els admins si és necessari)
    // Per seguretat, llistarem els correus primer
    for (const user of users) {
        const isSuperAdmin = user.email?.includes('admin') || user.email === 'miquel@ub.edu' // Exemple de filtre

        if (isSuperAdmin) {
            console.log(`Mantenint admin: ${user.email}`)
            continue
        }

        console.log(`Esborrant usuari: ${user.email} (${user.id})...`)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

        if (deleteError) {
            console.error(`Error esborrant ${user.email}:`, deleteError)
        } else {
            console.log(`✅ ${user.email} esborrat.`)
        }
    }

    console.log('--- Procés finalitzat ---')
}

deleteUsers()
