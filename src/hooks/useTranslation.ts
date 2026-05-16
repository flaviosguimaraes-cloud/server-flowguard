 import { useState, useEffect } from 'react';
 import { translations, Language, TranslationKey } from '../i18n/translations';
 
 export function useTranslation() {
  const [lang, setLang] = useState<Language>('pt-BR');

   useEffect(() => {
     const savedLang = (localStorage.getItem('language') || localStorage.getItem('lang')) as Language;
     if (savedLang && savedLang !== lang) {
       setLang(savedLang);
     }
   }, []);
 
   const t = (key: TranslationKey): string => {
     return translations[lang][key] || key;
   };
 
    const changeLanguage = (newLang: Language) => {
      setLang(newLang);
      localStorage.setItem('language', newLang);
      localStorage.setItem('lang', newLang); // Mantendo compatibilidade temporária
    };
 
   return { t, lang, changeLanguage };
 }