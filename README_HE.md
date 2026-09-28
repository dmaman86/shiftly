# Shiftly – מערכת לניהול שעות וחישוב שכר

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://dmaman86.github.io/shiftly/?utm_source=github&utm_medium=readme)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/dmaman86/shiftly)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5.0.15-433E38?logo=react&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
![MUI](https://img.shields.io/badge/Material_UI-7.0.2-007FFF?logo=mui&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.112.4-3ECF8E?logo=supabase&logoColor=white)
[![CI](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml/badge.svg)](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?logo=typescript)
[![codecov](https://codecov.io/gh/dmaman86/shiftly/branch/main/graph/badge.svg)](https://codecov.io/gh/dmaman86/shiftly)
![License](https://img.shields.io/badge/license-MIT-blue)

Shiftly מנהלת משמרות ומסבירה את חישובי השכר בישראל באמצעות מודל דומיין
שקוף, ניתן לבדיקה וניתן לאימות.

## התחלה מהירה

דרישה: Node.js 24. Bun 1.3.14 הוא מנהל החבילות המועדף, אך ניתן להריץ את
הסקריפטים באמצעות npm או Bun.

```bash
git clone https://github.com/dmaman86/shiftly.git
cd shiftly
nvm install
nvm use
npm install
npm run dev
```

פתחו את `http://localhost:5173/shiftly`.

## תיעוד

- [תיעוד פרויקט מפורט באנגלית](docs/reference/README.md)
- [תיעוד פרויקט מפורט בעברית](docs/reference/README_HE.md)
- [תיעוד הארכיטקטורה](docs/architecture/)
- [תרשימי הארכיטקטורה](docs/architecture/generated/)
- [היסטוריית הארכיטקטורה](docs/architecture/history/)

## פקודות נפוצות

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run test:e2e
```

ניתן להריץ את אותם סקריפטים באמצעות Bun כאשר משתמשים במנהל החבילות המועדף
של המאגר.

## רישיון

הפרויקט מופץ תחת רישיון [MIT](LICENSE).
\n\n
