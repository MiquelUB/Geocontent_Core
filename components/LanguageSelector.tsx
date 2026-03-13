'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname, routing } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Languages, Check } from 'lucide-react';

export default function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'ca', name: 'Català', flag: '🇦🇩' },
    { code: 'es', name: 'Castellano', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const handleLanguageChange = (newLocale: string) => {
    setIsOpen(false);
    // @ts-ignore
    router.push(pathname, { locale: newLocale });
  };

  return (
    <div className="relative z-[100]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all"
        aria-label="Change language"
      >
        <Languages size={20} className="text-white" />
        <span className="text-[12px] font-bold text-white uppercase">{locale}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-transparent"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10, x: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, x: -20 }}
              className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 overflow-hidden"
            >
              <div className="flex flex-col gap-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      locale === lang.code 
                        ? 'bg-white/20 text-white' 
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.name}</span>
                    </div>
                    {locale === lang.code && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
