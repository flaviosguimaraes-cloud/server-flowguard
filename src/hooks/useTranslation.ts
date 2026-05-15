 import { useState, useEffect } from 'react';
 import { translations, Language, TranslationKey } from '../i18n/translations';
 
 export function useTranslation() {
   const [lang, setLang] = useState<Language>(
     (localStorage.getItem('lang') as Language) || 'pt-BR'
   );
 
   const t = (key: TranslationKey): string => {
     return translations[lang][key] || key;
   };
 
   const changeLanguage = (newLang: Language) => {
     setLang(newLang);
     localStorage.setItem('lang', newLang);
   };
 
   return { t, lang, changeLanguage };
 }