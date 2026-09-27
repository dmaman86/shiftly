# Shiftly – מערכת לניהול שעות וחישוב שכר

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://dmaman86.github.io/shiftly/)

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
