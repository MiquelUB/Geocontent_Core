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
      className="relative w-full bg-primary bg-cover bg-center bg-no-repeat shrink-0 z-[60] shadow-md overflow-hidden"
      style={{
        backgroundImage: 'url(/header_sin_iconos.png)',
        height: '90px',
        backgroundColor: 'var(--primary)', // Fallback visible color
      }}
    >
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between">
        {/* Left section: Municipality Logo & Name */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shadow-inner">
            {brand?.logoUrl ? (
              <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-serif font-bold text-white">
                {brand?.name?.[0] || 'X'}
              </span>
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs font-black text-white uppercase tracking-wider leading-tight drop-shadow-sm">
              {brand?.name || 'Explora'}
            </span>
            <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-none">
              Territori Viu
            </span>
          </div>
        </div>

        {/* Right section: Language Selector & Help */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <LanguageSelector />
          
          <button
            onClick={onOpenHelp}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all active:scale-95 shadow-lg"
            title="Ajuda"
          >
            <span className="text-xl font-bold">?</span>
          </button>
        </div>
      </div>
    </header>
  )
}
