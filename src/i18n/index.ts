import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import heCommon from './locales/he/common.json';
import heErrors from './locales/he/errors.json';
import hePages from './locales/he/pages.json';
import heWorkTable from './locales/he/work-table.json';

// English locale files kept for potential future use (language toggle is currently disabled).
// Re-enable by restoring the en resources block and the localStorage detection in AppProviders.
// import enCommon from './locales/en/common.json';
// import enErrors from './locales/en/errors.json';
// import enPages from './locales/en/pages.json';
// import enWorkTable from './locales/en/work-table.json';

// localStorage detection removed — app is Hebrew-only.
// When toggle is re-enabled, restore:
// const storedDirection = localStorage.getItem('app-direction') ?? 'rtl';
// const activeLanguage = storedDirection === 'rtl' ? 'he' : 'en';

i18n.use(initReactI18next).init({
  lng: 'he',
  fallbackLng: 'he',
  defaultNS: 'common',
  ns: ['common', 'errors', 'pages', 'work-table'],
  resources: {
    he: {
      common: heCommon,
      errors: heErrors,
      pages: hePages,
      'work-table': heWorkTable,
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
