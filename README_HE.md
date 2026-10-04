<div dir="rtl">

# Shiftly

עובדים חושבים במשמרות. תלוש השכר מחושב בקטעים משוקללים. Shiftly מגשרת בין השניים: היא הופכת משמרות לפירוט שכר יומי ולאומדן שכר ברוטו חודשי.

<div dir="ltr">

[![CI](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml/badge.svg)](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dmaman86/shiftly/branch/main/graph/badge.svg)](https://codecov.io/gh/dmaman86/shiftly)
[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://dmaman86.github.io/shiftly/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Stack: TypeScript · React · Vite · Zustand · TanStack Query · MUI · Supabase · Vitest · Playwright

</div>

**[הדגמה חיה](https://dmaman86.github.io/shiftly/) · [English](README.md) · [תיעוד טכני מלא](docs/reference/README_HE.md)**

![הקלטת תהליך E2E במחשב בעברית: הזנת משמרות ופתיחת פירוט החישוב היומי](.github/assets/demos/august-2026-he-desktop.gif)

## למה הפרויקט נוצר

Shiftly נולדה מבעיה אמיתית שנצפתה במשרד ממשלתי.

עובדים עוקבים אחר שעות העבודה לפי משמרות: בלוק רציף של שעות עם התחלה וסוף ברורים. תלוש השכר הישראלי לא מחושב כך, אלא לפי קטעים משוקללים: מדרגות שעות נוספות שמתחילות מחדש בכל יום עבודה, תוספות שבת וחג שנכנסות לתוקף בשעות מסוימות, ותוספות לילה שחוצות משמרת באמצע.

התוצאה היא תסכול צפוי מראש: העובד מקבל תלוש שאין לו דרך מעשית לאמת. Shiftly מגשרת על הפער. היא מקבלת משמרות כפי שהעובד חושב עליהן, ומחשבת שכר לפי הכללים הנהוגים במשרדי ממשלה, כך שכל סכום ניתן לבדיקה ולהסבר.

ראו את [אימות חישובי השכר](VALIDATION_HE.md) ([English](VALIDATION.md)) למטריצת הראיות, להשוואות מול תוצאות שתוקנו לפי תלושי שכר אמיתיים, למגבלות הידועות ולתוכנית האימות.

> החישובים הם אומדני שכר ברוטו לצורכי המחשה ואינם תחליף לחישוב שכר רשמי.

## נקודות הנדסיות

- **מנוע חישוב עצמאי:** React צורכת את [חבילת TypeScript בשם `@shiftly/domain`](packages/domain/) דרך API ציבורי מפורש; למנוע אין תלות ב־React או ב־DOM.
- **בדיקת תוצר הפריסה:** תהליך ה־[CI](.github/workflows/ci.yml) מריץ E2E מול תוצר הייצור `dist` שהורד, ופורס את אותו תוצר רק לאחר שהבדיקות ו־E2E עברו.
- **כיסוי דפדפנים:** [פרויקטי Playwright](playwright.config.ts) בודקים Chromium במחשב, אמולציית Android ב־Chromium ואמולציית iPhone ב־WebKit.
- **שמירת נתונים לפי משתמש:** [מיגרציית בסיס הנתונים](supabase/migrations/20260830000000_persistence_schema.sql) מפעילה Row Level Security ב־Supabase על הגדרות חודשיות, ימי עבודה ומשמרות, עם מדיניות בעלות המבוססת על `auth.uid()`.

## פרופיל אישי

משתמשים מחוברים יכולים לפתוח את `/:lang/profile` לצפייה בכרטיס החשבון ובשלושה גרפים חודשיים: **שעות בפועל מול שעות לתשלום**, **שעות בסיס מול שעות נוספות**, ו־**הרכב סך התשלום** (שכר בסיס, תוספות ושעות נוספות, וקצבאות).

בורר משותף מחיל על כל הגרפים את **3, 6 או 12 החודשים האחרונים**, את **השנה הנוכחית**, או **טווח חודשים מותאם אישית** הכולל את שני קצות הטווח. ברירת המחדל היא שישה חודשים; הטווח הנתמך מתחיל בנובמבר 2015 ומסתיים בחודש הנוכחי.

ההיסטוריה מבוססת על נתוני החשבון השמורים, ללא שינויי כמויות זמניים בסיכום השכר. התשלום הוא אומדן ברוטו מחושב, לא שכר נטו ולא אישור לתשלום שהתקבל. כללי החישוב נשארים ציבוריים ב־`/:lang/calculation-rules`; אורחים שפותחים את הפרופיל מופנים לשם.

## התחלה מהירה

דרישות: Node.js 24 ו־Bun 1.3.14. התקינו באמצעות Bun כדי לקשר את חבילות
ה־workspace; המאגר משתמש בפרוטוקול התלויות `workspace:*` של Bun.

<div dir="ltr">

```bash
git clone https://github.com/dmaman86/shiftly.git
cd shiftly
nvm install
nvm use
bun install
bun run dev
```

</div>

פתחו את `http://localhost:5173/shiftly`.

## תיעוד

- [תיעוד טכני מלא באנגלית](docs/reference/README.md)
- [תיעוד טכני מלא בעברית](docs/reference/README_HE.md)
- [אימות חישובי השכר באנגלית](VALIDATION.md)
- [אימות חישובי השכר בעברית](VALIDATION_HE.md)
- [מנוע השכר העצמאי](packages/domain/README.md)
- [תיעוד הארכיטקטורה](docs/architecture/)
- [תרשימי הארכיטקטורה הנוכחית](docs/architecture/generated/)
- [היסטוריית הארכיטקטורה לפי tag](docs/architecture/history/)

## פקודות נפוצות

<div dir="ltr">

```bash
bun run typecheck
bun run lint
bun run test:ci
bun run build
bun run test:e2e
```

</div>

אפליקציית הווב נמצאת ב־`apps/web` וצורכת את `@shiftly/domain` מתוך
`packages/domain`. בעת עריכת המנוע, הריצו `bun run dev:domain` בחלון נוסף כדי
לעדכן את החבילה המהודרת בזמן ש־Vite פועל.

## רישיון

הפרויקט מופץ תחת רישיון [MIT](LICENSE).

</div>
