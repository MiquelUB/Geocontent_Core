'use client'

import { createClient } from '@/lib/database/supabase/client'
import { useRouter } from '@/i18n/routing'
import LanguageSelector from '@/components/LanguageSelector'

interface HeaderProps {
  visitedCount?: number
  unvisitedCount?: number
  nearbyCount?: number
}

export default function Header({ visitedCount = 0, unvisitedCount = 0, nearbyCount = 0 }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header 
      className="relative w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/header_sin_iconos.png)',
        height: 'auto',
        aspectRatio: '375 / 100', // Adjusted for better mobile fit
        minHeight: '100px',
        maxHeight: '180px'
      }}
    >
      {/* Container for Language Selector - Centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]">
        <LanguageSelector />
      </div>

      {/* Transparent avatar button positioned over the left avatar figure */}
      <button
        onClick={() => {
          // TODO: Navigate to profile or settings page
          console.log('Avatar clicked - navigate to profile')
        }}
        className="absolute bg-transparent hover:bg-white/10 transition-all duration-300 rounded-full"
        style={{
          left: '15px',
          top: '55%',
          transform: 'translateY(-50%)',
          width: '45px',
          height: '45px',
          // Visual debugging border (remove after positioning is confirmed)
          border: '2px solid rgba(255, 255, 255, 0.3)'
        }}
        title="Perfil"
        aria-label="Ver perfil"
      >
        <span className="sr-only">Perfil</span>
      </button>

      {/* Transparent logout button positioned over the right door ornament */}
      <button
        onClick={handleLogout}
        className="absolute bg-transparent hover:bg-white/10 transition-all duration-300 rounded-lg"
        style={{
          right: '15px',
          top: '55%',
          transform: 'translateY(-50%)',
          width: '45px',
          height: '45px',
          // Visual debugging border (remove after positioning is confirmed)
          border: '2px solid rgba(255, 255, 255, 0.3)'
        }}
        title="Salir"
        aria-label="Cerrar sesión"
      >
        {/* Optional: Add a subtle icon or leave completely transparent */}
        <span className="sr-only">Salir</span>
      </button>
    </header>
  )
}
