<div dir="rtl">

# Shiftly - מערכת לניהול שעות וחישוב שכר

> 📘 גרסה באנגלית זמינה כאן: [README.md](./README.md)

מערכת זו היא אפליקציה לניהול שעות עבודה וחישוב שכר מבוססת על **React + TypeScript**.
חישוב שכר כולל משמרות יומיות, ימים מיוחדים, אש״ל, כלכלה והכללים הנהוגים במשרדי ממשלה.

הפרויקט שם דגש לא רק על נכונות החישוב, אלא גם על **מידול דומיין ברור, יציבות ארכיטקטונית ותחזוקה ארוכת טווח**.

> ⚠️ המערכת מספקת חישוב אינדיקטיבי בלבד.  
> אין להסתמך על התוצאות לצורכי תלוש שכר רשמי,  
> והן אינן מחליפות חישוב המתבצע על ידי מדור שכר.

---

## מוטיבציה

Shiftly נולדה מבעיה אמיתית שנצפתה במשרד ממשלתי.

עובדים עוקבים אחר שעות העבודה לפי משמרות: בלוק רציף של שעות עם התחלה וסוף ברורים. תלוש השכר הישראלי לא מחושב כך, אלא לפי קטעים משוקללים: מדרגות שעות נוספות שמתחילות מחדש בכל יום עבודה, תוספות שבת וחג שנכנסות לתוקף בשעות מסוימות, ותוספות לילה שחוצות משמרת באמצע.

התוצאה היא תסכול צפוי מראש: העובד מקבל תלוש שאין לו דרך מעשית לאמת. Shiftly מגשרת על הפער. היא מקבלת משמרות כפי שהעובד חושב עליהן, ומחשבת שכר לפי הכללים הנהוגים במשרדי ממשלה, כך שכל סכום ניתן לבדיקה ולהסבר.

---

## עיקרון תכנוני מרכזי

העיקרון המרכזי מאחורי Shiftly הוא ש**לוגיקת החישוב נשארת יציבה לאורך זמן**.

חוקי השכר אינם משתנים לפי מימוש, אלא לפי **הקשר תקופתי**.
תאריכי לוח שנה, שכר שעתי, אש״ל וכלכלה מוגדרים כקלטים ולא כהתנהגות המקודדת בממשק.

בימים מיוחדים חלקיים, תחילת תעריף היום המיוחד נקבעת לפי כלל העסקי הנוכחי: **18:00 מאפריל עד ספטמבר ו־17:00 מאוקטובר עד מרץ**. תאריכים מתקבלים רק בפורמט `YYYY-MM-DD` ונבדקים כתאריכים קלנדריים תקינים.

גישה זו מאפשרת **חישוב לאחור של חודשים קודמים** באמצעות אותו שלד חישוב, רק עם פרמטרים תקופתיים שונים - ללא שינוי בקוד הדומיין.

---

## יכולות עיקריות

- חישוב שכר מבוסס משמרות
- תמיכה ב:
  - ימי עבודה רגילים
  - ימים מיוחדים חלקיים (למשל ימי שישי וערבי חג)
  - ימים מיוחדים מלאים (שבת, חגים)
- **חגים המחושבים בדפדפן, לצד ימי בחירות לכנסת שמפרסם ה־API**
  - פתרון אוטומטי של חגים יהודיים
  - הבחנה בין ימים מיוחדים מלאים לימים מיוחדים חלקיים
- ימי מחלה וחופשה
- משמרות החוצות יום
- חישוב אש״ל לפי ציר זמן היסטורי
- חישוב כלכלה (קטנה / גדולה)
- חישוב שכר שעתי אופציונלי: כאשר `baseRate > 0` מוצגות עמודת השכר היומי וסיכום השכר; מחיקה או הגדרה ל־`0` מסתירה אותן
- פירוט חודשי מצטבר
- חישוב אינקרמנטלי (הוספה / עדכון / הסרה של משמרות)
- ממשק משתמש ריאקטיבי לחלוטין
- ייצוא PDF אופקי מימין לשמאל עם הפרדה לפי שבועות, עמודות כלכלה עצמאיות, נתוני הגדרות בכל עמוד ו־footer של זכויות היוצרים
- תוספת יום הבחירות לכנסת (100% לעבודה רגילה בין 07:00 ל־22:00)
- התחברות אופציונלית עם Google ושמירת נתונים בין מכשירים דרך ה־API של Shiftly
- עמוד פרופיל: משתמשים מחוברים מקבלים כרטיס חשבון ושלושה גרפים היסטוריים עם טווח חודשים קבוע או מותאם אישית; אורחים רואים תצוגה מקדימה נעולה

---

## אימות ושמירת נתונים

מחשבוני השכר פועלים **גם ללא חשבון** — נתוני החישוב נשארים בזיכרון. הפרופיל האישי וההיסטוריה השמורה דורשים התחברות.

התחברות עם **חשבון Google** (דרך Supabase Auth) שומרת בנוסף את הנתונים שלך, מקושרים לחשבון שלך, כך שהם נשארים זמינים בין הפעלות ובין מכשירים. הדפדפן משתמש ב־Supabase להתחברות בלבד; כל קריאה וכתיבה עוברת דרך `apps/api`:

- **הגדרות חודשיות** — שנה, חודש, שעות תקן, שכר שעתי
- **סטטוס יום** — סימון מחלה / חופשה לכל יום
- **משמרות** — שעת התחלה, סיום ודגל תפקיד לכל משמרת שנשמרה
- **העברת זכות שבת** — שעות זכות שבת שלא נוצלו עוברות לחודש הבא במקום להיעלם

| טבלה | שומרת |
| --- | --- |
| `monthly_configs` | הגדרות לכל (משתמש, שנה, חודש), וגם יתרת זכות השבת המועברת |
| `work_days` | סטטוס לכל (משתמש, תאריך) (`sick` / `vacation`) — שורה חסרה משמעה `normal` |
| `shifts` | משמרות שנשמרו לכל משתמש, עם התאריך על כל שורה לצורך שאילתות ישירות |

הדפדפן אינו ניגש לטבלאות האלה. `apps/api` מאמת את אסימון הגישה בכל בקשה וקורא או כותב אותן רק עבור אותו משתמש, דרך `UserScope`; שמירת משמרת וייבוא חודש אורח רצים כפונקציות Postgres שרק השרת רשאי להפעיל. Row Level Security ומדיניות הבעלות נשארים פעילים כשכבת הגנה נוספת. הסכמה נמצאת ב־`supabase/migrations/`, ובדיקות pgTAP ב־`supabase/tests/` בודקות את ההרשאות שלה.

כל בקשה לנתוני משתמש מציינת את החשבון שעבורו נשלחה. אם חשבון אחר מתחבר לפני שהיא נשלחת, הבקשה מבוטלת ואינה מגיעה לנתוני החשבון החדש.

נתוני טבלת העבודה של משתמש מחובר נטענים באמצעות TanStack Query, עם מפתח מטמון המופרד לפי משתמש, שנה וחודש. העריכה זמינה רק לאחר השלמת הטעינה הראשונית, ובמקרה של כשל מוצגת פעולה מפורשת לניסיון חוזר. מעבר בין חשבונות מאפס את מצב העריכה לפני טעינת נתוני החשבון הבא.

הסיכום החודשי טוען ישירות את המשמרות ואת סטטוסי הימים השמורים כאשר השנה והחודש שנבחרו משתנים, ולכן אינו תלוי במעבר מוקדם לתצוגה היומית.

שינויים תקינים במשמרת נשמרים לאחר השהיה קצרה. פעולות כתיבה עבור אותו משתמש ואותו יום מתבצעות לפי הסדר, כדי שעדכון מאוחר לא יעקוף מחיקה שבוצעה אחריו. טיוטות עם שעות לא תקינות נשארות מקומיות עד לתיקונן.

---

## סקירת ארכיטקטורה

Shiftly מבוססת על עקרונות **Clean Architecture**, עם הפרדה ברורה בין לוגיקה עסקית, ממשק משתמש, ניהול מצב ושירותים חיצוניים.

המטרה היא לשמור על לוגיקת הדומיין **צפויה, ניתנת לבדיקה ובלתי תלויה בפריימוורקים**.

### זרימת חישוב כללית

Shiftly אינה ממדלת עבודה כסוגי משמרות קבועים. היא מפרשת ציר זמן אמיתי
ומפעילה כל כלל ברמה שבה הוא קיים:

```text
משמרות גולמיות
    ↓
סיווג ציר הזמן
    ↓
חישובי Regular / Special
    ↓
פירוט שכר יומי
    ↓
צבירה חודשית וכללים חודשיים בלבד
```

ההפרדה המרכזית היא:

- **Classification** — לאיזו קטגוריה שייך כל מקטע עבודה?
- **Calculation** — כיצד יש לתגמל את הזמן שסווג?
- **Aggregation** — מהו פירוט היום והסיכום החודשי?

כל כלל מופעל ברמה הטבעית שלו, והתוצאה מצטברת באופן דטרמיניסטי.

### סקירת מערכת

<details>
<summary>Overview</summary>

<!-- diagram:overview -->

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
%% Source: v1.1.0 (release candidate; source HEAD). Selected layer dependencies, including type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Solid arrows point from consumers to dependencies; dashed arrows show runtime calls across process boundaries.
%% The browser uses Supabase for authentication only; every data read and write goes through apps/api.
flowchart TD
  subgraph web["apps/web — React SPA on GitHub Pages"]
    layer_ui["Presentation<br/>Daily, monthly, calculation rules, public profile"]
    layer_app["Application and state<br/>Providers, hooks, Zustand editor state, TanStack Query"]
    layer_data["Services and adapters<br/>apiClient, reference caches, computed holidays, guest draft"]
  end
  subgraph domain_pkg["packages/domain"]
    layer_domain["@shiftly/domain — standalone payroll engine<br/>Calculation pipelines, ReferenceResolver"]
  end
  subgraph api["apps/api — Express 5 on Cloud Run (Node 24)"]
    api_http["middleware + routes<br/>/reference, /me, /admin"]
    api_core["services + ports<br/>Framework-free rules"]
    api_repos["repositories<br/>UserScope, Supabase adapters"]
    api_research["research pipelines + cli<br/>Admin only"]
  end
  subgraph supabase["Supabase"]
    sb_auth{{"Supabase Auth<br/>Google OAuth, JWT"}}
    sb_db[("Postgres<br/>User data, reference data, RLS")]
  end
  external_ga{{"Google Analytics"}}
  external_gemini{{"Google AI (Gemma)"}}
  layer_ui --> layer_app
  layer_ui --> layer_data
  layer_app --> layer_data
  layer_app --> layer_domain
  layer_data --> layer_domain
  layer_ui --> layer_domain
  api_http --> api_core
  api_http --> api_repos
  api_core -.->|"mirrors timeline validation<br/>contract test, no runtime import"| layer_domain
  api_repos -->|"implements ports"| api_core
  api_research --> api_repos
  layer_data -.->|"sign-in, session tokens only"| sb_auth
  layer_data -.->|"HTTPS + bearer token<br/>expectedUserId guard"| api_http
  layer_data -.->|"page views, events"| external_ga
  api_http -.->|"verify token, revalidate session"| sb_auth
  api_repos -.->|"service_role, scoped to the verified user"| sb_db
  api_research -.->|"extraction and research"| external_gemini
  e2e["Playwright E2E<br/>Hermetic: API and Auth from fixtures, data requests aborted"]
  e2e -.->|"exercises UI"| layer_ui
  pgtap["pgTAP<br/>Grants, RLS, backend-only RPCs"]
  pgtap -.->|"tests"| sb_db
  click layer_ui "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/routes/AppRoutes.tsx"
  click layer_app "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/AppProviders.tsx"
  click layer_data "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/api/client.ts"
  click layer_domain "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/composition.ts"
  click api_http "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/app.ts"
  click api_core "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/services"
  click api_repos "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/user-scope.ts"
  click api_research "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/research"
  click e2e "https://github.com/dmaman86/shiftly/blob/main/playwright.config.ts"
  click pgtap "https://github.com/dmaman86/shiftly/tree/main/supabase/tests"
  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  classDef toneViolet fill:#ede9fe,stroke:#7c3aed,stroke-width:1.5px,color:#2e1065
  class layer_ui toneBlue
  class layer_app toneMint
  class layer_data,api_repos toneRose
  class layer_domain,api_core toneAmber
  class api_http,api_research toneViolet
```

<!-- /diagram:overview -->

</details>

## שכבות מערכת

### דומיין
<details>
<summary>Domain</summary>

<!-- diagram:domain -->

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Selected module dependencies, including type imports; arrows point from consumers to dependencies.
%% Dashed arrows show injected runtime calls. Rates come from a ReferenceResolver: the web app builds one from the API's timelines, or uses the embedded baseline.
%% apps/api cannot import this package at runtime: it mirrors MonthlyTimeline's checks, and a contract test runs the same cases through both.
flowchart TD
  subgraph group_domain["Payroll logic"]
    node_0["composition<br/>[packages/domain/src/composition.ts]"]
    node_1["buildDayLayer.pipeline<br/>[packages/domain/src/pipelines/buildDayLayer.pipeline.ts]"]
    node_3["buildMonthLayer.pipeline<br/>[packages/domain/src/pipelines/buildMonthLayer.pipeline.ts]"]
    node_4["buildCalculators.pipeline<br/>[packages/domain/src/pipelines/buildCalculators.pipeline.ts]"]
    node_6["shiftmap.builder<br/>[packages/domain/src/builder/shiftmap.builder.ts]"]
    node_7["daypaymap.builder<br/>[packages/domain/src/builder/daypaymap.builder.ts]"]
    node_8["workdaysformonth.builder<br/>[packages/domain/src/builder/workdaysformonth.builder.ts]"]
    node_9["timeline-shift-pay.calculator<br/>[packages/domain/src/calculator/timeline-shift-pay.calculator.ts]"]
    node_10["classify-shift-timeline<br/>[packages/domain/src/timeline/classify-shift-timeline.ts]"]
    node_11["month-pay-map.reducer<br/>[packages/domain/src/reducer/month-pay-map.reducer.ts]"]
    node_12["workdayinfo.resolver<br/>[packages/domain/src/resolve/workdayinfo.resolver.ts]"]
    node_13["date.service<br/>[packages/domain/src/services/date.service.ts]"]
    node_14["shift.service<br/>[packages/domain/src/services/shift.service.ts]"]
    node_15["perdiem-month.reducer<br/>[packages/domain/src/reducer/perdiem-month.reducer.ts]"]
    node_16["workday-month.reducer<br/>[packages/domain/src/reducer/workday-month.reducer.ts]"]
    node_17["fixed-segment-month.reducer<br/>[packages/domain/src/reducer/fixed-segment-month.reducer.ts]"]
    node_18["meal-allowance-month.reducer<br/>[packages/domain/src/reducer/meal-allowance-month.reducer.ts]"]
    node_19["buildShiftLayer.pipeline<br/>[packages/domain/src/pipelines/buildShiftLayer.pipeline.ts]"]
    rate_pipeline["buildRateCalculators.pipeline<br/>[packages/domain/src/pipelines/buildRateCalculators.pipeline.ts]"]
    day_from_shifts["calculateDayFromShifts<br/>[packages/domain/src/calculator/day-from-shifts.calculator.ts]"]
    addition_classifier["AdditionClassifier<br/>[packages/domain/src/calculator/additions/addition.classifier.ts]"]
    base_hours["BaseHoursClassifier<br/>Base progression + election pay-equivalent hours<br/>[packages/domain/src/calculator/regular/base-hours.classifier.ts]"]
    election_hours["calculateElectionHours<br/>Regular overlap with election date 07:00–22:00<br/>[packages/domain/src/calculator/election-hours.calculator.ts]"]
    regular_day["RegularByDayCalculator<br/>Consolidated day timeline<br/>[packages/domain/src/calculator/regular/regularByDay.calculator.ts]"]
    calendar_types["CalendarEventKind / WorkDayMeta<br/>knessetNumber; calendarKnessetNumbers<br/>[packages/domain/src/types/types.ts]"]
    shabbat_credit["allocateShabbatCredit — exported credit allocation API<br/>[packages/domain/src/calculator/shabbat-credit.calculator.ts]"]
    reference_resolver["createReferenceResolver — rate by month, unavailable is explicit<br/>[packages/domain/src/reference/reference-resolver.ts]"]
    monthly_timeline["MonthlyTimeline<br/>[packages/domain/src/reference/timeline.ts]"]
    baseline["BASELINE_REFERENCES — embedded fallback timelines<br/>[packages/domain/src/reference/baseline.ts]"]
    system_start["SYSTEM_START_DATE<br/>[packages/domain/src/constants/system.constant.ts]"]
  end
  node_0 --> rate_pipeline
  node_0 --> baseline
  node_0 -->|"resolver type"| reference_resolver
  rate_pipeline --> reference_resolver
  baseline --> reference_resolver
  reference_resolver --> monthly_timeline
  reference_resolver --> system_start
  node_0 --> day_from_shifts
  node_0 -->|"policy type"| addition_classifier
  node_19 --> addition_classifier
  node_9 --> addition_classifier
  node_9 --> base_hours
  node_4 --> regular_day
  node_7 -.->|"calculateFromTimeline via injected calculator"| regular_day
  regular_day --> base_hours
  base_hours --> election_hours
  base_hours -->|"metadata type"| calendar_types
  election_hours -->|"timeline and election metadata types"| calendar_types
  node_8 -->|"build election metadata"| calendar_types
  node_0 -->|"depends on"| node_4
  node_0 -->|"depends on"| node_13
  node_0 -->|"depends on"| node_14
  node_0 -->|"depends on"| node_1
  node_0 -->|"depends on"| node_3
  node_0 -->|"depends on"| node_12
  node_0 -->|"depends on"| node_19
  node_1 -->|"depends on"| node_7
  node_1 -->|"depends on"| node_8
  node_3 -->|"depends on"| node_17
  node_3 -->|"depends on"| node_18
  node_3 -->|"depends on"| node_11
  node_3 -->|"depends on"| node_15
  node_3 -->|"depends on"| node_16
  node_6 -->|"depends on"| node_14
  node_6 -->|"depends on"| node_13
  node_6 -->|"depends on"| node_10
  node_6 -->|"depends on"| node_9
  node_8 -->|"depends on"| node_12
  node_8 -->|"depends on"| node_13
  node_10 -->|"depends on"| node_13
  node_11 -->|"depends on"| node_17
  node_11 -->|"depends on"| node_18
  node_11 -->|"depends on"| node_16
  node_14 -->|"depends on"| node_13
  node_19 -->|"depends on"| node_6
  node_19 -->|"depends on"| node_9
  click node_0 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/composition.ts"
  click node_1 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildDayLayer.pipeline.ts"
  click node_3 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildMonthLayer.pipeline.ts"
  click node_4 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildCalculators.pipeline.ts"
  click node_6 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/builder/shiftmap.builder.ts"
  click node_7 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/builder/daypaymap.builder.ts"
  click node_8 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/builder/workdaysformonth.builder.ts"
  click node_9 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/timeline-shift-pay.calculator.ts"
  click node_10 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/timeline/classify-shift-timeline.ts"
  click node_11 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/month-pay-map.reducer.ts"
  click node_12 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/resolve/workdayinfo.resolver.ts"
  click node_13 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/services/date.service.ts"
  click node_14 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/services/shift.service.ts"
  click node_15 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/perdiem-month.reducer.ts"
  click node_16 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/workday-month.reducer.ts"
  click node_17 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/fixed-segment-month.reducer.ts"
  click node_18 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/meal-allowance-month.reducer.ts"
  click node_19 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildShiftLayer.pipeline.ts"
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  class node_0,node_1,node_3,node_4,node_6,node_7,node_8,node_9,node_10,node_11,node_12,node_13,node_14,node_15,node_16,node_17,node_18,node_19 toneAmber
  class rate_pipeline,day_from_shifts,addition_classifier,shabbat_credit toneAmber
  click rate_pipeline "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildRateCalculators.pipeline.ts"
  click day_from_shifts "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/day-from-shifts.calculator.ts"
  click addition_classifier "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/additions/addition.classifier.ts"
  click shabbat_credit "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/shabbat-credit.calculator.ts"
  class base_hours,election_hours,regular_day,calendar_types toneAmber
  click base_hours "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/regular/base-hours.classifier.ts"
  click election_hours "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/election-hours.calculator.ts"
  click regular_day "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/regular/regularByDay.calculator.ts"
  click calendar_types "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/types/types.ts"
  click reference_resolver "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reference/reference-resolver.ts"
  click monthly_timeline "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reference/timeline.ts"
  click baseline "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reference/baseline.ts"
  click system_start "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/constants/system.constant.ts"
  class reference_resolver,monthly_timeline,baseline,system_start toneAmber
```

<!-- /diagram:domain -->

</details>

שכבת הדומיין מכילה לוגיקה עסקית טהורה ואינה תלויה ב-React, בניהול המצב או בספריות חיצוניות.

- **Builders**
  בניית מבני נתונים מורכבים ללא חוקים עסקיים.

- **סיווג ציר זמן**
  חלוקת מקטעי עבודה שרירותיים ל־`Regular` או `Special` באופן הדדי־בלעדי,
  כולל חציות יום, חגים, שבתות והקשרים היסטוריים.

- **Pipelines לחישוב**
  צינורות טהורים ונפרדים לסיווג ציר הזמן, שעות בסיס רגילות, תוספות המבוססות
  על מדיניות תאריך, שעות מיוחדות, אש״ל, כלכלה וחיפוש תעריפים היסטוריים.

- **Reducers**
  צבירה וביטול צבירה של נתונים מחושבים, המאפשרים חישוב אינקרמנטלי.

- **Resolvers**
  שירותי החלטה מרובי-מתודות (סיווג סוג יום, חודשים זמינים) שאינם מצטמצמים לחישוב יחיד של קלט/פלט.

- **Composition**
  חיבור מרכזי של רכיבי הדומיין דרך `pipelines/`. ה־API הציבורי מורכב ב־`packages/domain/src/composition.ts` ומיוצא מ־`packages/domain/src/index.ts`; אפליקציית האינטרנט מייבאת את `@shiftly/domain` ומשלבת אותו דרך `apps/web/src/app/domain/domain.instance.ts`.

### תצוגה
<details>
<summary>Presentation</summary>

<!-- diagram:presentation -->

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include lazy page imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Selected module dependencies; arrows point from consumers to dependencies.
%% ProfilePage is public: guests get GuestProfileCard and LockedProfileHistory, so useProfileHistory only runs for a signed-in user.
%% Reference and election notices surface degraded data (API unreachable, stale cache) instead of silently computing without it.
flowchart TD
  subgraph group_ui["Presentation"]
    app["App<br/>[apps/web/src/app/App.tsx]"]
    routes["AppRoutes — /:lang/daily, monthly, calculation-rules, profile<br/>[apps/web/src/app/routes/AppRoutes.tsx]"]
    layout["Layout<br/>[apps/web/src/layout/Layout.tsx]"]
    view_switcher["ViewSwitcher — desktop and mobile navigation<br/>[apps/web/src/layout/view-switcher/components/ViewSwitcher.tsx]"]
    daily["DailyPage<br/>[apps/web/src/pages/DailyPage.tsx]"]
    monthly["MonthlySummaryPage<br/>[apps/web/src/pages/MonthlySummaryPage.tsx]"]
    rules["CalculationRulesPage<br/>[apps/web/src/pages/CalculationRulesPage.tsx]"]
    profile_page["ProfilePage — account or guest view<br/>[apps/web/src/pages/ProfilePage.tsx]"]
    work_table["WorkTable<br/>[apps/web/src/features/work-table/components/month/WorkTable.tsx]"]
    salary_summary["MonthlySalarySummary<br/>[apps/web/src/features/salary-summary/components/MonthlySalarySummary.tsx]"]
    config_panel["ConfigPanel<br/>[apps/web/src/features/config/ConfigPanel.tsx]"]
    monthly_boundary["MonthlyContentBoundary — scoped period replacement<br/>[apps/web/src/features/monthly-data/MonthlyContentBoundary.tsx]"]
    reference_notice["ReferenceDataNotice / ReferenceIssueNotice<br/>[apps/web/src/features/reference/ReferenceDataNotice.tsx]"]
    election_notice["ElectionDataNotice — election days missing or stale<br/>[apps/web/src/features/calendar/ElectionDataNotice.tsx]"]
    auth_controls["AuthControls<br/>[apps/web/src/features/auth/AuthControls.tsx]"]
    sign_in["GoogleSignInButton<br/>[apps/web/src/features/auth/GoogleSignInButton.tsx]"]
    guest_notice["GuestModeNotice<br/>[apps/web/src/features/auth/GuestModeNotice.tsx]"]
    account_card["AccountProfileCard — delete account<br/>[apps/web/src/features/auth/AccountProfileCard.tsx]"]
    guest_card["GuestProfileCard<br/>[apps/web/src/features/auth/GuestProfileCard.tsx]"]
    profile_history["ProfileHistory — persisted charts<br/>[apps/web/src/features/profile/components/ProfileHistory.tsx]"]
    locked_history["LockedProfileHistory — disabled range, locked charts<br/>[apps/web/src/features/profile/components/LockedProfileHistory.tsx]"]
    conflict_dialog["GuestDraftConflictDialog<br/>[apps/web/src/features/guest-draft/GuestDraftConflictDialog.tsx]"]
  end
  subgraph group_app["Application and state"]
    use_work_days["useWorkDays<br/>[apps/web/src/hooks/useWorkDays.ts]"]
    use_reference_status["useReferenceStatus<br/>[apps/web/src/hooks/useReferenceStatus.ts]"]
    profile_query["useProfileHistory<br/>[apps/web/src/features/profile/hooks/useProfileHistory.ts]"]
    guest_import["GuestDraftImportProvider<br/>[apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx]"]
  end
  subgraph group_data["Services"]
    account_service["account.service — DELETE /me/account<br/>[apps/web/src/services/account/account.service.ts]"]
    api_error["resolveApiErrorMessage — API codes to i18n messages<br/>[apps/web/src/utils/api-error.resolve.util.ts]"]
  end
  app --> routes
  app --> layout
  layout --> view_switcher
  routes -->|"lazy"| daily
  routes -->|"lazy"| monthly
  routes -->|"lazy"| rules
  routes -->|"lazy"| profile_page
  daily --> work_table
  daily --> salary_summary
  daily --> config_panel
  daily --> monthly_boundary
  daily --> reference_notice
  daily --> election_notice
  daily --> auth_controls
  monthly --> salary_summary
  monthly --> config_panel
  monthly --> monthly_boundary
  monthly --> reference_notice
  monthly --> election_notice
  monthly --> auth_controls
  rules --> auth_controls
  work_table --> guest_notice
  guest_notice --> sign_in
  auth_controls --> sign_in
  profile_page -->|"user"| account_card
  profile_page -->|"user"| profile_history
  profile_page -->|"guest"| guest_card
  profile_page -->|"guest"| locked_history
  guest_card --> sign_in
  profile_history --> profile_query
  profile_history --> reference_notice
  profile_history --> election_notice
  election_notice --> use_work_days
  reference_notice --> use_reference_status
  guest_import --> conflict_dialog
  account_card --> account_service
  account_card --> api_error
  click app "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/App.tsx"
  click routes "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/routes/AppRoutes.tsx"
  click layout "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/layout/Layout.tsx"
  click view_switcher "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/layout/view-switcher/components/ViewSwitcher.tsx"
  click daily "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/DailyPage.tsx"
  click monthly "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/MonthlySummaryPage.tsx"
  click rules "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/CalculationRulesPage.tsx"
  click profile_page "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/ProfilePage.tsx"
  click work_table "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/components/month/WorkTable.tsx"
  click salary_summary "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/salary-summary/components/MonthlySalarySummary.tsx"
  click config_panel "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/config/ConfigPanel.tsx"
  click monthly_boundary "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/MonthlyContentBoundary.tsx"
  click reference_notice "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/reference/ReferenceDataNotice.tsx"
  click election_notice "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/calendar/ElectionDataNotice.tsx"
  click auth_controls "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/AuthControls.tsx"
  click sign_in "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/GoogleSignInButton.tsx"
  click guest_notice "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/GuestModeNotice.tsx"
  click account_card "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/AccountProfileCard.tsx"
  click guest_card "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/GuestProfileCard.tsx"
  click profile_history "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/components/ProfileHistory.tsx"
  click locked_history "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/components/LockedProfileHistory.tsx"
  click conflict_dialog "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/GuestDraftConflictDialog.tsx"
  click use_work_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useWorkDays.ts"
  click use_reference_status "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useReferenceStatus.ts"
  click profile_query "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/hooks/useProfileHistory.ts"
  click guest_import "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx"
  click account_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/account/account.service.ts"
  click api_error "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/utils/api-error.resolve.util.ts"
  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class app,routes,layout,view_switcher,daily,monthly,rules,profile_page,work_table,salary_summary,config_panel,monthly_boundary,reference_notice,election_notice,auth_controls,sign_in,guest_notice,account_card,guest_card,profile_history,locked_history,conflict_dialog toneBlue
  class use_work_days,use_reference_status,profile_query,guest_import toneMint
  class account_service,api_error toneRose
```

<!-- /diagram:presentation -->

</details>

#### טיפוסי האפליקציה וה־UI
`apps/web/src/app/` הוא שורש ההרכבה של אפליקציית האינטרנט. היא מייבאת את החבילה העצמאית `@shiftly/domain` ומשלבת את ה־API הציבורי שלה עבור React. לדוגמה, קוד האפליקציה קורא ל־`domain.payMap.calculateDayFromShifts(...)`.

חוזי הדומיין נמצאים תחת `packages/domain/src/types`. מודלים המיועדים ל־UI, כגון `PayBreakdownViewModel`, `CompactPayBreakdownVM` ו־`WorkDayInfo`, נמצאים תחת `apps/web/src/app/types`, משום שהם מתארים תצוגה ומצב אפליקטיבי ולא חוקי דומיין. Adapters וממפים של ה־features ממירים תוצאות דומיין למודלים האלו.

#### Hooks
שכבת תיאום דקה בין ה-UI, הדומיין וה-state.
אינה מכילה לוגיקה עסקית.

#### רכיבי UI
רכיבי תצוגה בלבד.
ה-UI מגיב לנתונים מחושבים ואינם מכיל חוקי שכר.

---

### אפליקציה
<details>
<summary>Application</summary>

<!-- diagram:application -->

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Selected module dependencies; arrows point from consumers to dependencies. Profile reads do not hydrate editor state.
%% DomainProvider builds the payroll engine from the API's reference timelines, falling back to the embedded baseline.
%% Every user-data service call carries the owner it was issued for (expectedUserId); a session switch cancels it.
flowchart TD
  subgraph group_app["Application and state"]
    providers["AppProviders<br/>[apps/web/src/app/providers/AppProviders.tsx]"]
    auth_provider["AuthProvider — Supabase Auth session<br/>[apps/web/src/app/providers/auth/AuthProvider.tsx]"]
    domain_provider["DomainProvider<br/>[apps/web/src/app/providers/domain/DomainProvider.tsx]"]
    use_timelines["useReferenceTimelines — API, cache or baseline<br/>[apps/web/src/app/providers/domain/useReferenceTimelines.ts]"]
    reference_status["referenceStatusContext<br/>[apps/web/src/app/providers/domain/referenceStatusContext.ts]"]
    domain_instance["domain.instance — engine with a ReferenceResolver<br/>[apps/web/src/app/domain/domain.instance.ts]"]
    reference_issues["referenceIssues — months without reference values<br/>[apps/web/src/app/domain/referenceIssues.ts]"]
    month_resolver["month.resolver<br/>[apps/web/src/app/months/month.resolver.ts]"]
    snackbar["AppSnackbarProvider<br/>[apps/web/src/app/providers/snackbar/AppSnackbarProvider.tsx]"]
    monthly_data["MonthlyDataProvider — monthly config load and save<br/>[apps/web/src/features/monthly-data/MonthlyDataProvider.tsx]"]
    config_status["monthlyConfigStatusContext<br/>[apps/web/src/features/monthly-data/monthlyConfigStatusContext.ts]"]
    config_actions["monthlyConfigActionsContext<br/>[apps/web/src/features/monthly-data/monthlyConfigActionsContext.ts]"]
    guest_import["GuestDraftImportProvider — owner-bound confirmation<br/>[apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx]"]
    import_gate["guestDraftImportContext<br/>[apps/web/src/features/guest-draft/guestDraftImportContext.ts]"]
    month_session["useWorkTableMonthSession — days and shifts<br/>[apps/web/src/features/work-table/hooks/month/useWorkTableMonthSession.ts]"]
    shift_upserts["useDebouncedShiftUpserts<br/>[apps/web/src/features/work-table/hooks/month/useDebouncedShiftUpserts.ts]"]
    draft_capture["useGuestDraftCapture<br/>[apps/web/src/features/work-table/hooks/month/useGuestDraftCapture.ts]"]
    work_days["useWorkDays — holidays + election days<br/>[apps/web/src/hooks/useWorkDays.ts]"]
    profile_query["useProfileHistory<br/>[apps/web/src/features/profile/hooks/useProfileHistory.ts]"]
    profile_loader["profileHistory.service — read-only loading<br/>[apps/web/src/features/profile/services/profileHistory.service.ts]"]
    profile_history["profileHistory — pure calculation<br/>[apps/web/src/features/profile/helpers/profileHistory.ts]"]
    global_store["globalStore — Zustand<br/>[apps/web/src/store/globalStore.ts]"]
    use_auth["useAuth<br/>[apps/web/src/hooks/useAuth.ts]"]
    use_domain["useDomain<br/>[apps/web/src/hooks/useDomain.ts]"]
  end
  subgraph group_data["Services"]
    monthly_config_service["monthlyConfig.service<br/>[apps/web/src/services/monthlyConfig/monthlyConfig.service.ts]"]
    shift_service["shift.service<br/>[apps/web/src/services/shift/shift.service.ts]"]
    work_day_service["workDay.service<br/>[apps/web/src/services/workDay/workDay.service.ts]"]
    guest_draft_service["guestDraft.service<br/>[apps/web/src/services/guestDraft/guestDraft.service.ts]"]
    reference_timelines["referenceTimelines<br/>[apps/web/src/services/reference/referenceTimelines.ts]"]
    election_days["electionDays<br/>[apps/web/src/services/reference/electionDays.ts]"]
    israeli_holidays["israeliHolidays — computed with jewish-date<br/>[apps/web/src/services/calendar/israeliHolidays.ts]"]
  end
  external_query{{"TanStack Query — queries and mutations"}}
  external_supabase{{"Supabase Auth SDK"}}
  external_domain{{"@shiftly/domain"}}
  providers --> auth_provider
  providers --> domain_provider
  providers --> snackbar
  auth_provider -->|"session only"| external_supabase
  domain_provider --> use_timelines
  domain_provider --> domain_instance
  domain_provider --> reference_status
  use_timelines --> reference_timelines
  use_timelines --> reference_status
  domain_instance --> month_resolver
  domain_instance --> reference_issues
  domain_instance --> external_domain
  use_domain --> domain_provider
  monthly_data --> config_status
  monthly_data --> config_actions
  monthly_data --> import_gate
  monthly_data --> monthly_config_service
  monthly_data --> global_store
  monthly_data --> use_auth
  guest_import --> import_gate
  guest_import --> guest_draft_service
  guest_import --> shift_service
  guest_import --> work_day_service
  guest_import --> use_auth
  month_session --> shift_service
  month_session --> work_day_service
  month_session --> shift_upserts
  month_session --> draft_capture
  month_session --> import_gate
  month_session --> global_store
  month_session --> use_auth
  work_days --> election_days
  work_days --> israeli_holidays
  work_days -->|"calendar event types"| external_domain
  profile_query --> profile_loader
  profile_query --> work_days
  profile_query --> use_auth
  profile_query --> use_domain
  profile_query --> import_gate
  profile_loader --> monthly_config_service
  profile_loader --> shift_service
  profile_loader --> work_day_service
  profile_loader --> profile_history
  profile_history --> global_store
  providers --> external_query
  monthly_data --> external_query
  month_session --> external_query
  profile_query -->|"wait for writes; cancel stale reads"| external_query
  click providers "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/AppProviders.tsx"
  click auth_provider "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/auth/AuthProvider.tsx"
  click domain_provider "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/domain/DomainProvider.tsx"
  click use_timelines "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/domain/useReferenceTimelines.ts"
  click reference_status "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/domain/referenceStatusContext.ts"
  click domain_instance "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/domain/domain.instance.ts"
  click reference_issues "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/domain/referenceIssues.ts"
  click month_resolver "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/months/month.resolver.ts"
  click snackbar "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/snackbar/AppSnackbarProvider.tsx"
  click monthly_data "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/MonthlyDataProvider.tsx"
  click config_status "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/monthlyConfigStatusContext.ts"
  click config_actions "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/monthlyConfigActionsContext.ts"
  click guest_import "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx"
  click import_gate "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/guestDraftImportContext.ts"
  click month_session "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/hooks/month/useWorkTableMonthSession.ts"
  click shift_upserts "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/hooks/month/useDebouncedShiftUpserts.ts"
  click draft_capture "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/hooks/month/useGuestDraftCapture.ts"
  click work_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useWorkDays.ts"
  click profile_query "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/hooks/useProfileHistory.ts"
  click profile_loader "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/services/profileHistory.service.ts"
  click profile_history "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/helpers/profileHistory.ts"
  click global_store "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/store/globalStore.ts"
  click use_auth "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useAuth.ts"
  click use_domain "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useDomain.ts"
  click monthly_config_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/monthlyConfig/monthlyConfig.service.ts"
  click shift_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/shift/shift.service.ts"
  click work_day_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/workDay/workDay.service.ts"
  click guest_draft_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/guestDraft/guestDraft.service.ts"
  click reference_timelines "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/referenceTimelines.ts"
  click israeli_holidays "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/calendar/israeliHolidays.ts"
  click election_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/electionDays.ts"
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class providers,auth_provider,domain_provider,use_timelines,reference_status,domain_instance,reference_issues,month_resolver,snackbar,monthly_data,config_status,config_actions,guest_import,import_gate,month_session,shift_upserts,draft_capture,work_days,profile_query,profile_loader,profile_history,global_store,use_auth,use_domain toneMint
  class monthly_config_service,shift_service,work_day_service,guest_draft_service,reference_timelines,election_days,israeli_holidays toneRose
```

<!-- /diagram:application -->

</details>

#### ניהול מצב
- **Zustand** מנהל את הגדרות התקופה הגלובליות ואת מפות השכר היומיות
- **React Context** מחזיק אימות, הזרקת תלויות, גבולות אינטגרציה ואת מצב העריכה הנוכחי של טבלת העבודה
- **TanStack Query** מתאם קריאות וכתיבות מאומתות של טבלת העבודה דרך apps/api
- מפות השכר היומיות מתעדכנות לפי תאריך, והפירוט החודשי נגזר באופן דטרמיניסטי מהמפות הנוכחיות

מצב Zustand גלובלי:

- `apps/web/src/store/globalStore.ts`
- `apps/web/src/store/globalBreakdown.ts`

### נתונים
<details>
<summary>Data</summary>

<!-- diagram:data -->

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Web data access. Solid arrows point from consumers to dependencies; dashed arrows are HTTP calls and browser storage.
%% supabase.client is used for authentication only (lint-enforced); user data and reference data come from apps/api.
%% apiClient attaches the session token on request, refreshes once on 401 and drops a call whose owner is no longer signed in.
flowchart TD
  subgraph group_data["Services and adapters (apps/web)"]
    api_client["apiClient — axios, bearer token, single refresh,<br/>expectedUserId guard, typed error codes<br/>[apps/web/src/services/api/client.ts]"]
    supabase_client["supabase.client — Auth only<br/>[apps/web/src/services/supabase/supabase.client.ts]"]
    monthly_config_service["monthlyConfig.service — /me/months/:y/:m/config, shabbat-credit<br/>[apps/web/src/services/monthlyConfig/monthlyConfig.service.ts]"]
    work_day_service["workDay.service — /me/months/:y/:m/work-days, /me/work-days/:date<br/>[apps/web/src/services/workDay/workDay.service.ts]"]
    shift_service["shift.service — /me/months/:y/:m/shifts, /me/shifts/:id<br/>[apps/web/src/services/shift/shift.service.ts]"]
    guest_draft_service["guestDraft.service — /me/months/:y/:m/guest-import<br/>[apps/web/src/services/guestDraft/guestDraft.service.ts]"]
    guest_draft_storage["guestDraft.storage — signed-out draft<br/>[apps/web/src/services/guestDraft/guestDraft.storage.ts]"]
    account_service["account.service — DELETE /me/account<br/>[apps/web/src/services/account/account.service.ts]"]
    reference_service["reference.service — /reference/elections, /reference/timelines<br/>[apps/web/src/services/reference/reference.service.ts]"]
    reference_timelines["referenceTimelines<br/>[apps/web/src/services/reference/referenceTimelines.ts]"]
    timeline_cache["timelineCache — last known timelines<br/>[apps/web/src/services/reference/timelineCache.ts]"]
    election_days["electionDays<br/>[apps/web/src/services/reference/electionDays.ts]"]
    election_cache["electionCache — last known election days<br/>[apps/web/src/services/reference/electionCache.ts]"]
    israeli_holidays["israeliHolidays — computed with jewish-date<br/>[apps/web/src/services/calendar/israeliHolidays.ts]"]
    analytics["analytics.service / gtag<br/>[apps/web/src/services/analytics/analytics.service.ts]"]
    holiday_adapter["holiday.adapter<br/>[apps/web/src/adapters/holiday.adapter.ts]"]
    election_adapter["election.adapter<br/>[apps/web/src/adapters/election.adapter.ts]"]
    timelines_adapter["referenceTimelines.adapter<br/>[apps/web/src/adapters/referenceTimelines.adapter.ts]"]
    pay_vm["dayToPayBreakdownVM / monthToPayBreakdownVM<br/>[apps/web/src/adapters/monthToPayBreakdownVM.ts]"]
    api_error["resolveApiErrorMessage — API client codes to messages<br/>[apps/web/src/utils/api-error.resolve.util.ts]"]
  end
  external_domain{{"@shiftly/domain"}}
  local_storage[("localStorage")]
  api{{"apps/api"}}
  sb_auth{{"Supabase Auth"}}
  external_analytics{{"Google Analytics (gtag)"}}
  monthly_config_service --> api_client
  work_day_service --> api_client
  shift_service --> api_client
  guest_draft_service --> api_client
  guest_draft_service -->|"draft type"| guest_draft_storage
  account_service --> api_client
  reference_service --> api_client
  api_client -->|"session token, user id"| supabase_client
  reference_timelines --> reference_service
  reference_timelines --> timeline_cache
  reference_timelines --> timelines_adapter
  election_days --> reference_service
  election_days --> election_cache
  timeline_cache --> reference_service
  election_cache --> reference_service
  holiday_adapter --> israeli_holidays
  election_adapter --> reference_service
  timelines_adapter --> external_domain
  holiday_adapter --> external_domain
  election_adapter --> external_domain
  pay_vm --> external_domain
  shift_service -->|"shift types"| external_domain
  work_day_service -->|"status enum"| external_domain
  api_client -.->|"HTTPS"| api
  supabase_client -.->|"OAuth, session refresh"| sb_auth
  guest_draft_storage -.-> local_storage
  timeline_cache -.-> local_storage
  election_cache -.-> local_storage
  analytics -.-> external_analytics
  click api_client "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/api/client.ts"
  click supabase_client "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/supabase/supabase.client.ts"
  click monthly_config_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/monthlyConfig/monthlyConfig.service.ts"
  click work_day_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/workDay/workDay.service.ts"
  click shift_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/shift/shift.service.ts"
  click guest_draft_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/guestDraft/guestDraft.service.ts"
  click guest_draft_storage "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/guestDraft/guestDraft.storage.ts"
  click account_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/account/account.service.ts"
  click reference_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/reference.service.ts"
  click reference_timelines "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/referenceTimelines.ts"
  click timeline_cache "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/timelineCache.ts"
  click election_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/electionDays.ts"
  click election_cache "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/electionCache.ts"
  click israeli_holidays "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/calendar/israeliHolidays.ts"
  click analytics "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/analytics/analytics.service.ts"
  click holiday_adapter "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/holiday.adapter.ts"
  click election_adapter "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/election.adapter.ts"
  click timelines_adapter "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/referenceTimelines.adapter.ts"
  click pay_vm "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/monthToPayBreakdownVM.ts"
  click api_error "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/utils/api-error.resolve.util.ts"
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class api_client,supabase_client,monthly_config_service,work_day_service,shift_service,guest_draft_service,guest_draft_storage,account_service,reference_service,reference_timelines,timeline_cache,election_days,election_cache,israeli_holidays,analytics,holiday_adapter,election_adapter,timelines_adapter,pay_vm,api_error toneRose
```

<!-- /diagram:data -->

</details>

#### Adapters
המרת אובייקטי דומיין למודלי תצוגה עבור ה-UI, תוך שמירה על ניתוק מלא מהדומיין.

### API בצד השרת
<details>
<summary>Backend API</summary>

<!-- diagram:api -->

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% apps/api on Cloud Run. Solid arrows point from consumers to dependencies; dashed arrows are calls to external systems.
%% services/ and ports/ never import Express, Supabase or adapters (ESLint-enforced); repositories/ implement the ports.
%% User-owned tables and api_* functions are reached only through UserScope, which pins every query to the verified caller.
flowchart TD
  subgraph entry["Entry points"]
    server["server.ts — reads config, builds adapters, listens<br/>[apps/api/src/server.ts]"]
    app["app.ts — middleware order and route mounting<br/>[apps/api/src/app.ts]"]
    config["config — env files and validation<br/>[apps/api/src/config/env.ts]"]
    cli["cli — election:record, election:activate,<br/>reference:activate, research<br/>[apps/api/src/cli/]"]
  end
  subgraph http["middleware/ and routes/"]
    middleware["cors, json-body (no compressed bodies), request-log<br/>[apps/api/src/middleware/]"]
    auth_mw["requireAuth, requireFreshSession, requireAdmin<br/>[apps/api/src/middleware/auth.ts]"]
    reference_routes["GET /reference/elections, /reference/timelines<br/>Public, cached<br/>[apps/api/src/routes/published-elections-router.ts]"]
    me_routes["/me — config, work-days, shifts,<br/>guest-import, account<br/>[apps/api/src/routes/]"]
    admin_routes["/admin/income-tax/:year<br/>Admin only<br/>[apps/api/src/routes/rules-router.ts]"]
  end
  subgraph core["services/ and ports/ — framework-free"]
    month_period["month-period — month and date bounds<br/>[apps/api/src/services/month-period.ts]"]
    published["published-elections / published-timelines<br/>Validate what is published<br/>[apps/api/src/services/published-timelines.ts]"]
    activation["election-record, election-activation,<br/>timeline-activation, store-candidates<br/>[apps/api/src/services/]"]
    ports["ports — AuthVerifier, RoleRepository,<br/>RevisionRepository<br/>[apps/api/src/ports/]"]
    errors["UserDataError + HTTP mapping<br/>[apps/api/src/errors/user-data-errors.ts]"]
  end
  subgraph adapters["repositories/ — Supabase adapters"]
    user_scope["UserScope — select/delete pinned to user_id,<br/>rpc only api_* with p_user_id<br/>[apps/api/src/repositories/user-scope.ts]"]
    user_repos["monthly-config, work-days, shifts,<br/>guest-import repositories<br/>[apps/api/src/repositories/]"]
    auth_adapters["supabase-auth-verifier, supabase-role-repository<br/>[apps/api/src/repositories/supabase-auth-verifier.ts]"]
    account_deleter["account-deleter — Auth admin API<br/>[apps/api/src/repositories/account-deleter.ts]"]
    reference_readers["cached + supabase published readers,<br/>revision repository<br/>[apps/api/src/repositories/]"]
  end
  research["research/ — income tax, social security,<br/>evidence, source policy<br/>[apps/api/src/research/]"]
  sb_auth{{"Supabase Auth"}}
  sb_db[("Supabase Postgres")]
  gemini{{"Google AI (Gemma)"}}
  sources{{"Public sources<br/>Wikipedia, Kol Zchut, BTL, Wayback"}}
  server --> config
  server --> app
  server -->|"builds"| user_scope
  server -->|"builds"| auth_adapters
  server -->|"builds"| account_deleter
  server -->|"builds"| reference_readers
  cli --> config
  cli --> activation
  cli --> reference_readers
  cli --> research
  app --> middleware
  app --> auth_mw
  app --> reference_routes
  app --> me_routes
  app --> admin_routes
  app --> errors
  auth_mw --> ports
  reference_routes --> published
  me_routes --> auth_mw
  me_routes --> month_period
  me_routes --> user_repos
  me_routes --> user_scope
  me_routes --> account_deleter
  admin_routes --> research
  research -->|"store candidates, coverage"| activation
  research --> ports
  month_period --> errors
  activation --> ports
  activation --> research
  user_repos --> month_period
  user_scope --> ports
  user_scope --> errors
  auth_adapters -->|"implements"| ports
  reference_readers -->|"implements"| ports
  reference_readers --> published
  account_deleter --> errors
  auth_adapters -.->|"verify token, revalidate session, roles"| sb_auth
  account_deleter -.->|"admin.deleteUser; rows cascade"| sb_auth
  user_scope -.->|"service_role"| sb_db
  reference_readers -.->|"published revisions"| sb_db
  research -.-> gemini
  research -.-> sources
  click server "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/server.ts"
  click app "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/app.ts"
  click config "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/config/env.ts"
  click cli "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/cli"
  click middleware "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/middleware"
  click auth_mw "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/middleware/auth.ts"
  click reference_routes "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/routes/published-elections-router.ts"
  click me_routes "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/routes"
  click admin_routes "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/routes/rules-router.ts"
  click month_period "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/services/month-period.ts"
  click published "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/services/published-timelines.ts"
  click activation "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/services"
  click ports "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/ports"
  click errors "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/errors/user-data-errors.ts"
  click user_scope "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/user-scope.ts"
  click user_repos "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/repositories"
  click auth_adapters "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/supabase-auth-verifier.ts"
  click account_deleter "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/account-deleter.ts"
  click reference_readers "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/repositories"
  click research "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/research"
  classDef toneViolet fill:#ede9fe,stroke:#7c3aed,stroke-width:1.5px,color:#2e1065
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  class server,app,config,cli toneMint
  class middleware,auth_mw,reference_routes,me_routes,admin_routes toneViolet
  class month_period,published,activation,ports,errors toneAmber
  class user_scope,user_repos,auth_adapters,account_deleter,reference_readers toneRose
  class research toneViolet
```

<!-- /diagram:api -->

</details>

`apps/api` רץ ב־Cloud Run. הדפדפן מתחבר דרך Supabase Auth ושולח את אסימון הגישה; ה־API מאמת אותו וניגש לנתוני המשתמש רק דרך `UserScope`, שמצמיד כל שאילתה למשתמש המאומת. המבנה וכלל התלויות מתוארים ב־[apps/api/README.md](../../apps/api/README.md).

---
## מושגי דומיין

### Builders

אחראים להרכבת מבני דומיין:

- `ShiftMapBuilder`
- `DayPayMapBuilder`
- `WorkDaysForMonthBuilder`

`DefaultShiftMapBuilder` מנרמל כל משמרת תקינה לציר זמן רציף ומעביר אותה ל־`TimelineShiftPayCalculator`. לכן חציית חצות היא עניין של ציר הזמן, ולא מקרה נפרד בחישוב השכר.

### Calculators

לוגיקת חישוב טהורה מאורגנת לפי תחום:

- **סיווג ציר הזמן**: הפרדה בין `Regular` ל־`Special` לפני חישוב השכר
- **שעות בסיס רגילות**: התקדמות `100% → 125% → 150%`
- **תוספות**: `+20%` ערב ו־`+50%` לילה באמצעות policy המבוססת על תאריך
- **שעות מיוחדות**: `150%` ביום ו־`200%` בלילה, ללא תוספות רגילות
- **אש״ל**: תעריפים לפי ציר זמן וחישוב יומי; הצבירה החודשית מתבצעת ב־Reducer
- **כלכלה**: חישוב זכאות ותעריף ב־Calculator יחיד המבוסס על ציר זמן
- **מקטעים קבועים**: מחלה, חופשה וזכות שבת שנצברה
- **סיווג סוג יום לפי חג**: כללי הלוח העברי המחושבים בדפדפן

ההתקדמות הבסיסית נצברת לאורך היום לפי ההגדרות `standardHours` ו־`midTierThreshold`: ברירת המחדל היא בדרך כלל 8 שעות תקן ושעתיים בדרגת הביניים. השעות הראשונות מחושבות ב־100%, הדרגה הבאה ב־125%, והיתרה ב־150%. גבולות שנוצרו על ידי סיווג הציר, חצות או זמן מיוחד אינם מאפסים את ההתקדמות. התוספות `+20%` ו־`+50%` מחושבות בנפרד באמצעות policy המבוססת על תאריך. הזכאות לתוספת ערב דורשת לפחות שלוש שעות רגילות מזכות במשמרת אחת באותו תאריך קלנדרי; שעות ממשמרות נפרדות באותו תאריך אינן מצטברות לצורך הסף. במשמרת שחוצה חצות, הזכאות נבדקת בנפרד לכל תאריך קלנדרי בתוך המשמרת.

#### מונחים עבור זכות שבת

זכות שבת מיוצגת באמצעות שני ערכים נפרדים, משום שצבירת הזכות והשימוש בה הם אירועים עסקיים שונים:

- `earnedShabbatCredit` הוא הקרדיט שנצבר מעבודה בשבת או בחג. הוא נשמר במפות השכר היומיות והחודשיות של הדומיין ומהווה את מאגר הזכות החודשי.
- `appliedShabbatCredit` הוא החלק מתוך המאגר החודשי שהוקצה להשלמת חוסרי שעות. הוא קיים במודלי התצוגה, ורק הוא נכלל בסך השעות ובחישוב השכר.

המקצה החודשי שומר גם את מקור השעות שהוקצו באמצעות `usageByDate`.
עבור כל יום זכאי נשמר כמה שעות הגיעו מכל יום שצבר זכות וכמה הגיעו מהחודש הקודם.
סדר הצריכה הוא FIFO: קודם יתרה מהחודש הקודם, ולאחר מכן ימי הצבירה לפי סדר כרונולוגי.
מכיוון שההתמדה הנוכחית שומרת את יתרת החודש הקודם כמספר מצטבר, היא מוצגת
כ־`previous-month` ולא לפי תאריכים בודדים.

לדוגמה:

```text
2026-08-03 נוצלו 6.67 שעות:
  3.50 שעות מהחודש הקודם
  2.00 שעות מתאריך 2026-08-01
  1.17 שעות מתאריך 2026-08-02
```

המאגר החודשי יכול להשלים ימים ללא עבודה או ימים שבהם בוצעו פחות משעות התקן, כאשר סוג היום הוא `Regular` או `SpecialPartialStart`, ללא תלות במועד שבו הזכות נצברה במהלך החודש. ניתן להשלים כל יום עד שעות התקן שהוגדרו עבורו בלבד. החלוקה מתבצעת בסדר כרונולוגי כדי לשמור על תוצאה דטרמיניסטית וניתנת לבקרה.

יתרה שלא הוקצתה מוצגת כזכות שבת שלא נוצלה:

```text
unusedShabbatCredit = earnedShabbatCredit - appliedShabbatCredit
actualHours = worked hours
totalHours = worked hours + sick hours + vacation hours + appliedShabbatCredit
```

זכות שלא נוצלה מוצגת למשתמש, אך אינה נכללת בסך השעות או בחישוב השכר.

### יום הבחירות לכנסת

בחירות לכנסת נפרדות מחגים דתיים המסומנים `yomtov`. מתאם האירועים מזהה `category: "election"`, `subcat: "knesset"` ו־`knessetNumber`, ומעביר את מספר הכנסת למטא־נתוני היום כדי להציג תגית מתורגמת בדסקטופ ובמובייל. תאריכי בחירות סמוכים זמינים למשמרות חוצות חצות דרך `calendarKnessetNumbers`.

לפי כלל השכר שהגדיר בעל הפרויקט, עבודה רגילה החופפת ל־**07:00–22:00 בתאריך הבחירות הקלנדרי** מזכה בתוספת 100%. התוספת מתווספת ל־`regular.hours100.hours` אחרי הפירוק הרגיל ל־100/125/150. היא אינה צורכת `standardHours`, משנה מדרגות שעות נוספות, מגדילה את `actualHours`/`totalHours` או חלה על מקטעים מיוחדים והיעדרויות ללא עבודה. תוספות ערב/לילה נותרות נפרדות. שעות 100% אלה הן כמויות שוות־ערך לתשלום, ולא כולן זמן עבודה בפועל.

בדוגמת 2021-03-23, בשעות 06:37–14:32 ועם שבע שעות תקן: העבודה בפועל היא `475/60`, החפיפה המזכה `452/60`, מקטע 100% הוא `7 + 452/60` ומקטע 125% הוא `55/60`. בתצוגה: 7.92 שעות עבודה, 14.53 ב־100% ו־0.92 ב־125%; החישוב הפנימי שומר על דיוק דקות. זהו חוזה המימוש המוסכם, לא אימות משפטי עצמאי.

החגים מחושבים בדפדפן לפי כללי הלוח העברי; אין עוד קובצי לוח סטטיים. ימי הבחירות לכנסת הם נתוני ייחוס במסד הנתונים: מנהל רושם כל בחירות עם הראיה הרשמית ומפעיל אותן (`election:record`, `election:activate` ב־apps/api), והאפליקציה קוראת את הימים שפורסמו מ־`GET /reference/elections`. כשאין גישה ל־API, האפליקציה שומרת את התשובה האחרונה הידועה או מתריעה שימי הבחירות חסרים. ראו [סקריפטים](../../scripts/README.md) ו[מגבלות האימות](../../VALIDATION_HE.md).

### Reducers

צבירה והפחתה של נתונים:

- Reducer חודשי למפת שכר
- צובר שעות רגילות
- Reducer חודשי למקטעים קבועים
- Reducer חודשי לאש״ל
- Reducer חודשי לימי עבודה

### Resolvers

שירותי החלטה מרובי-מתודות שאינם מצטמצמים לחישוב יחיד של קלט/פלט:

- Resolver חודש — חודשים זמינים וחודש ברירת מחדל לשנה נתונה
- Resolver מידע יום עבודה — שאילתות סוג יום והמשכיות בין ימים

### Services

כלי שירות ברמת הדומיין:

- `DateService`: טיפול ואימות תאריכים
- `ShiftService`: לוגיקה עסקית הקשורה למשמרות

### Pipelines

צינורות הרכבה לחיבור רכיבי דומיין:

- `buildRateCalculators`: מחשבוני חגים, תעריף אש״ל ותעריף כלכלה
- `buildCalculators`: מופעי Calculators
- `buildShiftLayer`: לוגיקה ברמת משמרת
- `buildDayLayer`: צבירה ברמת יום
- `buildMonthLayer`: צבירה ברמת חודש

---

## טכנולוגיות

### ליבה

- **React** 19.2.3
- **TypeScript** 5.7.2
- **Vite** 8

### State וניווט

- **Zustand** 5.0.15 (מצב גלובלי בצד הלקוח)
- **TanStack Query** 5 (סנכרון מצב שרת עבור משתמשים מחוברים)
- **React Router** 7

### UI ועיצוב

- **Material UI (MUI)** 7.0.2
- **Notistack** 3.0.2 (התראות)

### נתונים ושירותים

- **Axios** 1.18.1 (HTTP client)
- **date-fns** 4.1.0 (טיפול בתאריכים)
- **jewish-date** 2.0.29 (לוח עברי לחישוב חגים)
- **Supabase** 2.112.4 (התחברות Google בדפדפן; Postgres דרך `apps/api`)

### שרת (`apps/api`)

- **Node.js** 24 (type stripping, ללא שלב build) ב־**Google Cloud Run**
- **Express** 5.3
- **Zod** 4 (אימות בקשות ומשתני סביבה)
- **Supabase** 2.112.4 עם המפתח הסודי, מאחורי `UserScope`
- **Google Gen AI** 2.27 (מחקר נתוני ייחוס למנהלים בלבד)

### בדיקות

- **Vitest** 4
- **Testing Library** (React, Jest-DOM, User Event)
- **Playwright** 1.63 (בדיקות מקצה לקצה ב־Chromium וב־WebKit)
- **pgTAP** (הרשאות בסיס הנתונים, Row Level Security ופונקציות של השרת בלבד)

---

## מבנה הפרויקט

```plaintext
.
├── .github/
│   ├── assets/                 # צילומי מסך לקובצי README
│   └── workflows/              # CI, בדיקות pull request ופריסה
├── docs/
│   └── architecture/           # תרשימי ארכיטקטורה וגרסאות היסטוריות
├── e2e/                         # בדיקות Playwright מקצה לקצה ו-fixtures
├── playwright.config.ts         # הגדרות Playwright
├── scripts/                     # סנכרון תרשימים ובדיקת צירי זמן של תעריפים
├── apps/api/src/                # השרת ב־Cloud Run (ראו apps/api/README.md)
│   ├── middleware/             # CORS, גוף JSON, יומן בקשות, אימות
│   ├── routes/                 # נתבי /reference, /me ו־/admin
│   ├── services/               # כללים ללא תלות ב־framework
│   ├── ports/                  # ממשקים שהשירותים תלויים בהם
│   ├── repositories/           # מתאמי Supabase, כולל UserScope
│   ├── research/               # מחקר נתוני ייחוס למנהלים
│   └── cli/                    # פקודות ניהול
├── apps/web/src/
│   ├── adapters/               # מתאמי מידע חיצוני והמרה מהדומיין לתצוגה
│   ├── app/                    # שורש ההרכבה של האפליקציה
│   │   ├── domain/             # מופע הדומיין וטיפוסים לשכבת האפליקציה
│   │   ├── types/              # מודלים לשכבת האפליקציה ול־UI
│   │   ├── providers/          # ספקי אימות, כיוון, דומיין והתראות
│   │   └── routes/             # ניתוב האפליקציה וניתוב מותאם שפה
│   ├── constants/              # קבועי דומיין וממשק משותפים
│   ├── components/             # רכיבי ממשק משותפים להצגה
│   ├── features/               # ממשק ותיאום בבעלות כל פיצ'ר
│   │   ├── auth/               # פקדי התחברות Google
│   │   ├── calculation-rules/  # כללים ודוגמת חישוב אינטראקטיבית
│   │   ├── config/             # פרמטרי עבודה ושמירת תצורה חודשית
│   │   ├── feedback/           # התראות ומשוב למשתמש
│   │   ├── info-dialog/        # חלון מידע על האפליקציה
│   │   ├── monthly-data/       # טעינה ושמירה של תצורה חודשית
│   │   ├── monthly-pay/        # שכר חודשי מחושב והקצאת זיכוי שבת
│   │   │   └── hooks/          # חישוב הקצאה ושמירת העברה
│   │   ├── profile/            # היסטוריה לקריאה בלבד, מדדים, גרפים ובחירת טווח
│   │   ├── salary-summary/     # רכיבי שכר חודשיים ומודלי תצוגה
│   │   │   ├── components/     # תצוגת סיכום השכר
│   │   │   ├── helpers/        # בניית מקטעי השכר
│   │   │   ├── hooks/          # hooks לתיאום סיכום השכר
│   │   │   ├── mappers/        # מיפוי שורות שכר וקצבאות
│   │   │   └── vm/             # מודלי תצוגה של סיכום השכר
│   │   ├── work-table/         # עריכת חודש/יום/משמרת ותצוגות חישוב
│   │   │   ├── assets/         # נכסי פיצ'ר טבלת העבודה
│   │   │   ├── components/     # רכיבים לפי חודש, יום ומשמרת
│   │   │   ├── context/        # context למצב עריכת יום העבודה
│   │   │   ├── helpers/        # שינויי מצב ועזרי ייצוא PDF
│   │   │   ├── hooks/          # hooks לפי חודש, יום ומשמרת
│   │   │   └── mappers/        # מיפויים לפי חודש, יום ומשמרת
│   │   └── workday-timeline/   # ציר זמן חזותי של המשמרות
│   ├── hooks/          # hooks לתיאום סיכום השכר
│   │   │   ├── mappers/        # מיפוי שורות שכר וקצבאות
│   │   │   └── vm/             # מודלי תצוגה של סיכום השכר
│   │   ├── work-table/         # עריכת חודש/יום/משמרת ותצוגות חישוב
│   │   │   ├── assets/         # נכסי פיצ'ר טבלת העבודה
│   │   │   ├── components/     # רכיבים לפי חודש, יום ומשמרת
│   │   │   ├── context/        # context למצב עריכת יום העבודה
│   │   │   ├── helpers/        # שינויי מצב ועזרי ייצוא PDF
│   │   │   ├── hooks/          # hooks לפי חודש, יום ומשמרת
│   │   │   └── mappers/        # מיפויים לפי חודש, יום ומשמרת
│   │   └── workday-timeline/   # ציר זמן חזותי של המשמרות
│   ├── hooks/          # hooks לתיאום סיכום השכר
│   │   │   ├── mappers/        # מיפוי שורות שכר והטבות
│   │   │   └── vm/             # מודלי תצוגה של סיכום השכר
│   │   ├── work-table/         # עריכה וחישוב רספונסיביים לפי חודש, יום ומשמרת
│   │   │   ├── components/     # רכיבים המחולקים לחודש, יום ומשמרת
│   │   │   ├── context/        # context למצב העריך של יום העבודה
│   │   │   ├── helpers/        # שינויי מצב וייצוא PDF
│   │   │   ├── hooks/          # hooks המחולקים לחודש, יום ומשמרת
│   │   │   └── mappers/        # מיפויים המחולקים לחודש, יום ומשמרת
│   │   └── workday-timeline/   # ציר זמן חזותי למשמרות
│   ├── hooks/                  # React hooks משותפים לאינטגרציה
│   ├── i18n/                   # משאבי עברית/אנגלית וזיהוי שפה מהכתובת
│   ├── layout/                 # פריסת האפליקציה וגבולות שגיאה
│   ├── pages/                  # עמודים יומיים, חודשיים, כללי חישוב ופרופיל
│   ├── store/                  # מצב גלובלי באמצעות Zustand וחישובי פירוט
│   ├── services/               # לקוחות Analytics, apps/api ו־Supabase Auth
│   ├── test/                   # בדיקות אפליקציית האינטרנט, store, שירותים וממשק
│   └── utils/                  # טיפול בתוצאות API וכלי עזר משותפים
├── packages/
│   └── domain/
│       ├── src/                 # מנוע שכר עצמאי מפריימוורק ו־index.ts ציבורי
│       └── tests/               # בדיקות דומיין ללא תלות ב־React
└── supabase/
    ├── functions/               # Edge Function ישנה בשם delete-account (מוסרת)
    ├── migrations/              # סכמה, Row Level Security ופונקציות של השרת בלבד
    └── tests/                   # בדיקות pgTAP לבסיס הנתונים
```

---

## התנהגות ממשק המשתמש

## תצוגות מערכת

Shiftly כוללת שתי תצוגות חישוב עיקריות, עמוד כללים ציבורי ופרופיל למשתמשים מחוברים:

| נתיב | גישה | מטרה |
| --- | --- | --- |
| `/:lang/daily` | ציבורית | הזנת משמרות ופירוט יומי |
| `/:lang/monthly` | ציבורית | חישוב שכר חודשי |
| `/:lang/calculation-rules` | ציבורית | כללי חישוב, דוגמה אינטראקטיבית והדגמה |
| `/:lang/profile` | למשתמשים מחוברים | כרטיס חשבון והיסטוריה חודשית שמורה |

`:lang` הוא `he` או `en`; הנתיבים נמצאים תחת נתיב הבסיס המוגדר של האפליקציה.

### תצוגה יומית

- מיועדת להזנת משמרות יומיות
- מאפשרת הוספה, עריכה ובקרה של משמרות
- מציגה פירוק שכר יומי
- הסיכום החודשי מתעדכן באופן אינקרמנטלי
- מורידה את טבלת העבודה ישירות כקובץ PDF אופקי מימין לשמאל
- במובייל, בחירת יום מציגה את כרטיס היום כשהפרטים המורחבים סגורים כברירת מחדל. אפשרויות מחלה/חופשה, עריכת משמרות והסיכום המקוצר נשארים גלויים; פירוט השכר המלא נפתח לפי דרישה.

#### ייצוא PDF

- הכותרת משתמשת בחודש ובשנה שנבחרו: `שעות החודש {monthName} {year}`.
- בעמוד הראשון, מתחת לכותרת, מוצגים כתובת הדוא״ל של המשתמש המחובר אם קיימת, `baseRate` ו־`standardHours`.
- בעמודים נוספים נתוני ההגדרות חוזרים בכותרת, ובכל עמוד מוצג ה־footer של זכויות היוצרים של Shiftly.
- גבולות שבועיים מודגשים חזותית, ונתוני הכלכלה מיוצאים בשלוש עמודות נפרדות: `אש״ל`, `כלכלה גדולה` ו־`כלכלה קטנה`.
- ה־PDF נוצר עם טקסט Unicode מוטמע, לכן ניתן לבחור ולחפש את הכותרות, נתוני ההגדרות, כותרות העמודות, הערכים וה־footer, כולל תוכן בעברית.

### תצוגה חודשית

- מיועדת לניתוח שכר חודשי מצטבר
- מחייבת בחירת שנה וחודש
- מבטיחה דיוק תעריפי אש״ל וכלכלה לפי התקופה
- טוענת את המשמרות ואת סטטוסי הימים השמורים לתקופה שנבחרה באופן עצמאי מהתצוגה היומית
- מציגה סיכום חודשי קומפקטי וברור

שתי התצוגות משתמשות באותו מנגנון חישוב דומיין.
רק ההקשר וההצגה משתנים.

### פרופיל וגרפים היסטוריים

כרטיס החשבון נמצא בפרופיל, בנפרד מעמוד כללי החישוב הציבורי. הניווט במחשב ובמובייל מציג קישור לפרופיל רק למשתמשים מחוברים. כניסה ישירה לפרופיל ממתינה לאתחול האימות; אורחים מופנים ל־`/:lang/calculation-rules` באותה שפה, תוך שמירת פרמטרי השאילתה. מדיניות RLS של Supabase נשארת גבול הבעלות בצד השרת.

שלושת הגרפים משתמשים בהגדרות חודשיות, בסטטוסי ימים ובמשמרות שנשמרו:

- **שעות בפועל מול שעות לתשלום:** שעות בפועל אינן כוללות מחלה וחופשה; שעות לתשלום כוללות היעדרויות בתשלום וזיכוי שבת שנוצל, ללא מכפילי שעות נוספות.
- **שעות בסיס מול שעות נוספות:** שעות במקטע 100% מול השעות במקטעי 125% ו־150%. תוספות ערב, לילה ושבת אינן שעות עבודה נוספות.
- **הרכב סך התשלום:** שכר בסיס, תוספות וקצבאות מסתכמים לסך הברוטו המחושב בסיכום השכר ללא עריכות זמניות. התוספות כוללות את מלוא התשלום לשעות נוספות, לא רק את הפרמיה; הקצבאות כוללות אש״ל וארוחות. זה אינו שכר נטו או אישור לתשלום שהתקבל.

בורר אחד מעל שלושת הגרפים מציע את **3, 6 או 12 החודשים האחרונים**, את **השנה הנוכחית** (מינואר ועד החודש הנוכחי), ו־**חודש התחלה וסיום מותאמים אישית**. ברירת המחדל היא שישה חודשים. הטווח המותאם כולל את שני הקצוות ומוחל רק לאחר **החלת הטווח**; טיוטה לא תקינה או הפוכה אינה משנה את הטווח הפעיל. התאריכים מוגבלים לנובמבר 2015 ועד החודש הנוכחי, ורק החודש הנוכחי עצמו מסומן כחלקי.

ההיסטוריה היא לקריאה בלבד ומחושבת מחדש במנוע הדומיין הנוכחי, לא צילום שכר בלתי משתנה. היא משתמשת ביתרת זיכוי השבת השמורה מהחודש הקודם ואינה כוללת שינויי כמויות זמניים בסיכום השכר. נתונים חסרים נבדלים מחודש עם אפס שעות; תשלום אינו זמין ללא שכר שעתי חיובי שנשמר. כשל טעינה מציג אפשרות לניסיון חוזר במקום סכומים חלקיים בגרפים.

שאילתות ההיסטוריה מופרדות לפי משתמש ושני קצות הטווח, ממתינות לכתיבות או לייבוא פעילים, מבטלות תוצאות מיושנות וטוענות בקבוצות של שלושה חודשים. הגרפים כוללים tooltips למקלדת ולמגע וטבלאות ערכים מדויקים הנפתחות לפי דרישה, באמצעות רכיבי MUI ו־CSS קיימים. התרגומים באנגלית ובעברית נמצאים תחת `profile_page` בקובצי `pages.json` המתאימים, ללא namespace נפרד.

### פאנל הגדרות (ConfigPanel)

רכיב ה־`ConfigPanel` מותאם להקשר הפעיל:

- **בתצוגה יומית**:
  - הגדרת שעות תקן ושכר שעתי
  - כאשר `baseRate > 0` מוצגים שכר יומי וסיכום השכר החודשי
  - מחיקת השכר השעתי או הגדרתו ל־`0` מסתירה את הפלט התלוי בשכר

- **בתצוגה חודשית**:
  - בחירת שנה וחודש היא הכרחית
  - מבטיחה תעריפי אש״ל וכלכלה מדויקים לפי התקופה
  - מחייבת הגדרת שכר שעתי לצורך חישוב

הפרדה זו מונעת חישוב שגוי ומחדדת אחריות.

### תצוגת יום עבודה

- אם `baseRate` הוא `0`: מוצגות רק שעות העבודה.
- אם `baseRate > 0`: מוצגים עמודת שכר יומי, שכר יומי וסיכום שכר חודשי.
- **ימי מחלה / חופשה**: לא מאפשרים הזנת משמרות.
- **שבת / חג**: מאפשרים עבודה בלבד (ללא היעדרות).
- **משמרת חוצה יום**: דורשת אישור מפורש מהמשתמש.
- **כרטיסי יום במובייל**: שעות נוספות, שבת, תוספות, זכות שבת ופרטי פירוט נוספים מוסתרים עד להרחבת הכרטיס.
- כאשר נעשה שימוש בזכות שבת, היום מציג את סך השעות שנוצלו ואת מקורותיהן, כולל ימי הצבירה והחודש הקודם. בתצוגת מחשב ההסבר מוצג בשורה אחת; במובייל המקורות מוצגים בשורות נפרדות.

### הדגמות E2E

<details>
<summary>זרימת אוגוסט 2026 בעברית במחשב</summary>

![זרימת אוגוסט 2026 בעברית במחשב](../../.github/assets/demos/august-2026-he-desktop.gif)
</details>

<details>
<summary>זרימת אוגוסט 2026 בעברית במובייל</summary>

![זרימת אוגוסט 2026 בעברית במובייל](../../.github/assets/demos/august-2026-mobile-he.gif)
</details>

### לוגיקת הגדרת יום עבודה

**שבת או חג - עבודה מותרת**

- לא ניתן לסמן יום כמחלה או חופש, אך ניתן להזין משמרות עבודה.
  ![Shabbat Sick Vacation Example](../../.github/assets/screenshots/shabbat-sick-vacation.png)

**יום מחלה או חופש - ללא משמרות עבודה**

- כאשר יום מסומן כמחלה או חופש, לא ניתן להזין בו משמרות עבודה.
  ![Sick Select Example](../../.github/assets/screenshots/sick-vacation-select.png)
  ![Vacation Select Example](../../.github/assets/screenshots/vacation-day-select.png)

**משמרת חוצה יום - תיבת סימון ״חוצה יום״**

- כאשר שעת הסיום היא ביום הבא המערכת מבקשת אישור מפורש על חציית יום.
  ![Cross Day Warning](../../.github/assets/screenshots/cross-day-warning.png)
  ![Cross Day](../../.github/assets/screenshots/shift-save.png)

**סיכום פירוט יומי - תצוגת מחשב**

|                                 פרטים סגורים                                  |                                 פרטים מורחבים                                  |
| :----------------------------------------------------------------------------: | :-----------------------------------------------------------------------------: |
| ![פירוט יומי במחשב עם פרטים סגורים](../../.github/assets/screenshots/breakdown-summary-1.png) | ![פירוט יומי במחשב עם פרטים מורחבים](../../.github/assets/screenshots/breakdown-summary-2.png) |

**סיכום פירוט יומי - תצוגת מובייל**

|                                פרטים סגורים                                 |                                פרטים מורחבים                                 |
| :---------------------------------------------------------------------------: | :----------------------------------------------------------------------------: |
| ![פירוט יומי במובייל עם פרטים סגורים](../../.github/assets/screenshots/breakdown-mobile-1.png) | ![פירוט יומי במובייל עם פרטים מורחבים](../../.github/assets/screenshots/breakdown-mobile-2.png) |

**סיכום חודשי**
![Monthly Summary](../../.github/assets/screenshots/monthly-summary.png)

---

## למה ארכיטקטורה זו?

הארכיטקטורה נבחרה כדי להתמודד עם:

- חוקי שכר מורכבים
- מקרי קצה מבוססי זמן
- רמות צבירה שונות (משמרת → יום → חודש)
- חישוב אינקרמנטלי ללא חישוב מחדש מלא
- דיוק היסטורי ללא שינוי בלוגיקה הליבה

היא מאפשרת התפתחות עתידית של המערכת **בלי להעמיס לוגיקה מותנית ברכיבי ה-UI**.

---

## הערות מימוש

- כל האחוזים מנורמלים (לדוגמה: `1` = 100%, `1.5` = 150%, `2` = 200%)
- לוגיקת הדומיין בלתי תלויה בפריימוורק וניתנת לבדיקה באופן מלא
- ה־UI מגיב לנתונים ולא מכיל חוקים עסקיים
- משמרות Duty/Meal Allowance מוצגות כ־`Duty` בתצוגת ההדפסה באנגלית וכ־`תפקיד` בתצוגת ההדפסה בעברית
- חישובים היסטוריים משתמשים בהקשר מבוסס זמן, לא בשינויי קוד

---

## בדיקות

Shiftly משתמשת ב־**Vitest** לבדיקות יחידה ואינטגרציה, עם דגש על אימות לוגיקת הדומיין.

### הרצת בדיקות

```bash
# הרצת בדיקות במצב watch
bun run test

# הרצת בדיקות עם ממשק UI
bun run test:ui

# הרצת בדיקות עם כיסוי קוד
bun run test:coverage

# הרצת בדיקות במצב CI (הרצה חד־פעמית)
bun run test:ci

# בדיקות בסיס נתונים (pgTAP); דורש Supabase CLI ו־Docker
bun run test:db
```

`bun run test` מכסה את אפליקציית הווב, את `@shiftly/domain` ואת `apps/api`.

### בדיקות End-to-End

הבדיקות מחולקות לפי מה שכל רמה מוכיחה:

| רמה | היקף |
|---|---|
| Unit (Vitest) | כללי הדומיין, שירותים, mappers ורכיבים |
| Integration (Vitest) | כל fixture של חודש מלא דרך מסלול החישוב של האפליקציה, ללא דפדפן |
| Desktop E2E (Playwright, Chromium) | הזנת חודש מלא דרך הטבלה באנגלית ובעברית, וכן פריסה ברוחב טאבלט |
| Mobile E2E (Playwright, Android + iPhone) | בחירת חודש בבורר המודאלי, עריכת משמרות וניווט בתפריט ללא גלילה אופקית; הזנת חודש מלא דרך לוח השנה וכרטיס היום ב־Android |

בדיקות המובייל רצות על שני פרופילים: `android` (Pixel 10, Chromium) ו־`iphone` (iPhone 15, WebKit). זרימת החודש המלא רצה רק ב־Android, משום ש־WebKit ללא ממשק ב־Linux של ה־CI זקוק לכמה דקות עבורה, ותוצאות החודש אינן תלויות במנוע הדפדפן. כל הבדיקות רצות עם שעון קבוע (`e2e/support/app.ts`), כך שהתרחישים אינם תלויים בתאריך הנוכחי.

יש להתקין את דפדפני Playwright פעם אחת לאחר התקנת התלויות:

```bash
playwright install chromium webkit
```

הרצת בדיקות הקצה לקצה:

```bash
# הרצת בדיקות E2E
bun run test:e2e

# פתיחת ממשק Playwright
bun run test:e2e:ui

# הרצה עם דפדפן גלוי
bun run test:e2e:headed
```

תרחישי החודש המלאים (קובצי הקלט והתוצאות הצפויות) נמצאים תחת:

```text
e2e/
├── fixtures/
│   ├── august-2026.json / august-2026.result.json
│   ├── march-2021.json / march-2021.result.json
│   ├── march-2022.json / march-2022.result.json
│   ├── october-2021.json / october-2021.result.json
│   └── october-2025.json / october-2025.result.json
├── support/          # טעינת תרחישים, עיצוב ערכים והכנת האפליקציה
├── desktop/          # פרויקט "desktop"
│   ├── work-table-month.spec.ts
│   └── tablet-layout.spec.ts
└── mobile/           # פרויקטים "android" ו־"iphone"
    ├── work-table-month.spec.ts   # Android בלבד
    ├── month-picker.spec.ts
    ├── shift-editing.spec.ts
    └── navigation.spec.ts
```

כל ה־fixtures נבדקים בבדיקת האינטגרציה של Vitest `apps/web/src/test/integration/work-table-month-fixtures.test.ts`, שמריצה את אותו מסלול חישוב של האפליקציה ללא דפדפן. Playwright מריץ דרך הממשק את מרץ 2021 ואת אוגוסט 2026: דסקטופ באנגלית ובעברית, ו־Android בעברית, כולל תגית הבחירות. טוען התרחישים משתמש בלוח השנתי הסטטי אלא אם הוגדר לוח מפורש בנתוני הקלט. מרץ נוצר כבסיס ראשוני ולאחר מכן תוקן בידי בעל הפרויקט לפי תלוש השכר האישי האמיתי שלו, כפי שאישר ב־2026-10-19. הערכים הצפויים הנוכחיים הם תוצאות ייחוס מהמציאות לפי אישורו, המושוות בשתי ספרות עשרוניות. יש לשמר את התיקונים ולא להחליפם בפלט דומיין חדש כדי להעביר בדיקות.

מקומית, Playwright מפעיל שרת Vite מבודד על `127.0.0.1:4173` בנתיב `/shiftly/`, משתמש במקור הדומיין, משבית HMR ואינו מבצע build או משתמש בשרת קיים. ב־CI הוא מגיש את `dist/` המוכן מראש באמצעות `vite preview`. בקשות לוח השנה מדומות מתוך נתוני התרחיש. בדסקטופ כל פירוט יום נסגר לאחר בדיקתו וממתינים לסיום המעבר לפני ההמשך; הכפתורים ממורכזים הרחק מהסיכום המקובע.
ה־workflow של ה־CI מתקין Chromium ו־WebKit ומריץ את חבילת בדיקות ה־E2E באופן אוטומטי.

### בדיקות איכות ובניית גרסת Production

```bash
# בדיקת טיפוסים של האפליקציה ושל הגדרות Vite
bun run typecheck

# הרצת ניתוח סטטי
bun run lint

# יצירת חבילת production בתיקייה dist/
bun run build
```

### כיסוי בדיקות

הבדיקות מכסות:

- לוגיקת חישוב (builders, calculators, reducers)
- פתרונות מבוססי זמן (חגים, תעריפים, מקטעים)
- מקרי קצה (משמרות חוצות יום, ימים חלקיים, מחלה/חופשה)
- התנהגות ממשק ההגדרות וטבלת העבודה, כולל הצגת השכר בעת שינוי `baseRate`
- תרחישי חישוב מקצה לקצה

שכבת הדומיין ניתנת לבדיקה באופן מלא ובלתי תלויה בפריימוורק, מה שמקל על אימות חוקים עסקיים בבידוד.

---

## התחלה מהירה

Shiftly דורשת Node.js 24. Bun 1.3.14 מוגדר כמנהל החבילות המועדף ב־`package.json`, אך פקודות הסקריפטים עצמן תואמות ל־npm ול־Bun. גרסת Node.js המדויקת של ה־CI מוגדרת בקובץ `.nvmrc`.

```bash
git clone https://github.com/dmaman86/shiftly.git
cd shiftly
nvm install
nvm use
bun install
bun run dev

# מנהל חבילות חלופי:
# bun install --frozen-lockfile
# bun run dev
```

כניסה ל־`http://localhost:5173/shiftly` בדפדפן.

### הגדרת התחברות ושמירת נתונים (אופציונלי)

מצב אורח עובד בלי שום הגדרה — שום דבר לא נשמר, ואין צורך בחשבון.

התחברות ושמירת נתונים דורשות פרויקט Supabase ואת ה־API של Shiftly.

1. **אפליקציית הווב.** צרו `.env.local` בשורש המאגר:

   ```bash
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   VITE_API_URL=http://localhost:3000
   ```

2. **ה־API.** צרו `apps/api/.env` עם המשתנים המפורטים ב־[apps/api/README.md](../../apps/api/README.md#environment), ואז הריצו `bun run dev:api`. המפתח הסודי נשאר ב־API: לעולם אל תוסיפו לו את הקידומת `VITE_`.

3. **הפניות.** התחברות עם Google תמיד חוזרת לשורש האפליקציה (`<origin>/shiftly/`) ולאחר מכן משחזרת את הדף שממנו המשתמש התחיל. תחת **Authentication → URL Configuration → Redirect URLs**, אפשרו את השורש הזה עבור כל origin שבו אתם משתמשים, לדוגמה:

   ```text
   https://dmaman86.github.io/shiftly/**
   http://localhost:5173/shiftly/**
   ```

4. **בסיס הנתונים.** החילו את המיגרציות שב־`supabase/migrations/` באמצעות `supabase db push` (או הריצו אותן לפי הסדר ב־SQL Editor). הן יוצרות את הטבלאות `monthly_configs`, `work_days` ו־`shifts`, את מדיניות ה־Row Level Security שלהן ואת הפונקציות שה־API מפעיל.

מחיקת חשבון עוברת דרך ה־API (`DELETE /me/account`): הוא מאמת מחדש את ההתחברות מול Supabase Auth ואז מוחק את המשתמש עם המפתח הסודי. מאחר שהטבלאות משתמשות ב־`on delete cascade`, השורות של המשתמש נמחקות איתו. ה־Edge Function בשם `supabase/functions/delete-account` שביצעה זאת בעבר כבר אינה בשימוש ותוסר בקרוב.

---

## רישיון

הפרויקט מופץ תחת רישיון [MIT](../../LICENSE).

</div>
