'use client'

import { createClient } from '@/lib/database/supabase/client'
import { useRouter } from '@/i18n/routing'
import LanguageSelector from '@/components/LanguageSelector'

interface HeaderProps {
  visitedCount?: number
  unvisitedCount?: number
  nearbyCount?: number
  onNavigate?: (screen: string) => void
  onOpenHelp?: () => void
  brand?: any
}

export default function Header({ visitedCount = 0, unvisitedCount = 0, nearbyCount = 0, onNavigate, onOpenHelp, brand }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("core_user")
    router.push('/login')
  }

  return (
    <header 
      className="relative w-full bg-cover bg-center bg-no-repeat shrink-0 z-[60] shadow-md"
      style={{
        backgroundImage: 'url(/header_sin_iconos.png)',
        height: 'auto',
        aspectRatio: '375 / 100',
        minHeight: '70px',
        maxHeight: '100px'
      }}
    >
      {/* Logos & Help (Home-style elements integrated) */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
        {/* Left section: Profile & Logo */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => onNavigate?.('profile')}
            className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden shadow-sm bg-black/10 backdrop-blur-sm"
          >
            <span className="sr-only">Perfil</span>
            <div className="w-full h-full flex items-center justify-center bg-primary/20">
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">YOU</span>
            </div>
          </button>
          
          <div className="hidden xs:flex flex-col">
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-tighter leading-none">
              {brand?.name || 'PXX'}
            </span>
          </div>
        </div>

        {/* Right section: Help & Logout */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenHelp}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white"
            title="Ayuda"
          >
            <span className="text-xl">?</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white"
            title="Salir"
          >
             <span className="text-xl">🚪</span>
          </button>
        </div>
      </div>

      {/* Container for Language Selector - Centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] pointer-events-auto">
        <LanguageSelector />
      </div>
    </header>
  )
}
