import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import deTranslations from './locales/de.json';
import frTranslations from './locales/fr.json';
import itTranslations from './locales/it.json';
import caTranslations from './locales/ca.json';
import nlTranslations from './locales/nl.json';

i18n
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      de: { translation: deTranslations },
      fr: { translation: frTranslations },
      it: { translation: itTranslations },
      ca: { translation: caTranslations },
      nl: { translation: nlTranslations }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'de', 'fr', 'it', 'ca', 'nl'],
    debug: false,
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Update HTML lang attribute when language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

// Set initial language
document.documentElement.lang = i18n.language || 'en';

export default i18n;

