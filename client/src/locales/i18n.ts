import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import only available translations
import translationEn from './en/translation.json';
import translationZhHans from './zh-Hans/translation.json';

// Define available resources
const resources = {
  en: {
    translation: translationEn,
  },
  'zh-Hans': {
    translation: translationZhHans,
  },
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-Hans', // 默认使用中文
    debug: false,

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;