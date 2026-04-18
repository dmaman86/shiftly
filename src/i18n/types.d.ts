import type heCommon from './locales/he/common.json';
import type heErrors from './locales/he/errors.json';
import type hePages from './locales/he/pages.json';
import type heWorkTable from './locales/he/work-table.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof heCommon;
      errors: typeof heErrors;
      pages: typeof hePages;
      'work-table': typeof heWorkTable;
    };
  }
}
