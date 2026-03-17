type SupportedLocale = 'ca' | 'es' | 'en' | 'fr';

/**
 * Extreu el camp localitzat d'un objecte de la BD.
 * Estratègia prioritària (segons skill): columnes separades (ex: title_ca, title_es).
 * Estratègia secundària: objecte JSONB (ex: title_translations).
 * Fallback: Català ('ca') o camp base.
 */
export function getLocalizedContent(row: any, field: string, locale: string): string {
  if (!row) return '';

  // 1. Intentar columna específica per idioma (estil skill: title_ca, title_es...)
  const columnLocalized = row[`${field}_${locale}`];
  if (columnLocalized !== undefined && columnLocalized !== null) return columnLocalized;

  // 2. Intentar objecte JSONB de traduccions (estil flexible: title_translations o titleTranslations)
  const translations = row[`${field}_translations`] || row[`${field}Translations` || `${field}Translation` ];
  if (translations && typeof translations === 'object') {
    const jsonLocalized = translations[locale];
    if (jsonLocalized) return jsonLocalized;
    
    const jsonFallback = translations['ca'];
    if (jsonFallback) return jsonFallback;
  }

  // 3. Fallback a la columna de l'idioma base (Català)
  const columnFallback = row[`${field}_ca`];
  if (columnFallback !== undefined && columnFallback !== null) return columnFallback;

  // 4. Fallback final al camp base sense sufix
  return row[field] || '';
}

/**
 * Extreu un camp traduït d'un objecte JSONB de traduccions (legacy/helper).
 */
export function getTranslation(translations: any, locale: string, fallbackLocale: string = 'ca'): string {
  if (!translations || typeof translations !== 'object') return '';
  return translations[locale] || translations[fallbackLocale] || Object.values(translations)[0] || '';
}
