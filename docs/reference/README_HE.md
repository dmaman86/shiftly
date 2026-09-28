<div dir="rtl">

# Shiftly - מערכת לניהול שעות וחישוב שכר

> 📘 גרסה באנגלית זמינה כאן: [README.md](./README.md)

מערכת זו היא אפליקציה לניהול שעות עבודה וחישוב שכר מבוססת על **React + TypeScript**.
חישוב שכר כולל משמרות יומיות, ימים מיוחדים, אש״ל, כלכלה וחוקי עבודה מהעולם האמיתי.

הפרויקט שם דגש לא רק על נכונות החישוב, אלא גם על **מידול דומיין ברור, יציבות ארכיטקטונית ותחזוקה ארוכת טווח**.

> ⚠️ המערכת מספקת חישוב אינדיקטיבי בלבד.  
> אין להסתמך על התוצאות לצורכי תלוש שכר רשמי,  
> והן אינן מחליפות חישוב המתבצע על ידי מדור שכר.

---

## מוטיבציה

**Shiftly** נולד מבעיה אמיתית שנצפתה בסביבת עבודה ממשלתית.

עובדים עוקבים אחר שעות העבודה שלהם לפי **משמרות** — בלוק רציף של שעות עם התחלה וסוף ברורים. אבל תלושי השכר הישראליים לא עובדים כך. הם מחושבים לפי **קטעים משוקללים**: מדרגות שעות נוספות שמתאפסות בכל יום, תוספות שבת וחג שנכנסות לתוקף בשעות מסוימות, ותוספות לילה שחוצות משמרת באמצעה.

התוצאה היא מקור מתסכול ידוע מראש: עובדים מקבלים תלוש שכר שאין להם דרך מעשית לאמת, ואין כלי פשוט שיסביר מאיפה הגיעו המספרים.

**Shiftly** גושר על הפער הזה. הוא מקבל קלט של משמרות בצורה שבה עובדים באמת חושבים — ומחשב את התגמול לפי חוקי העבודה הישראליים: מדרגות שעות נוספות, תוספות שבת וחג, ותוספות לילה — כדי להפוך את החישוב **לשקוף וניתן לאימות** עבור מי שמקבל את התלוש.

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
- **זיהוי חגים באמצעות API של Hebcal**
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
- התחברות אופציונלית עם Google ושמירת נתונים בין מכשירים

---

## אימות ושמירת נתונים

Shiftly פועלת במלואה **גם ללא חשבון** — הכל רץ בזיכרון, ושום דבר לא נשמר.

התחברות עם **חשבון Google** (דרך Supabase Auth) שומרת בנוסף את הנתונים שלך ב-Supabase, מקושרים לחשבון שלך, כך שהם נשארים זמינים בין הפעלות ובין מכשירים:

- **הגדרות חודשיות** — שנה, חודש, שעות תקן, שכר שעתי
- **סטטוס יום** — סימון מחלה / חופשה לכל יום
- **משמרות** — שעת התחלה, סיום ודגל תפקיד לכל משמרת שנשמרה
- **העברת זכות שבת** — שעות זכות שבת שלא נוצלו עוברות לחודש הבא במקום להיעלם

| טבלה | שומרת |
| --- | --- |
| `monthly_configs` | הגדרות לכל (משתמש, שנה, חודש), וגם יתרת זכות השבת המועברת |
| `work_days` | סטטוס לכל (משתמש, תאריך) (`sick` / `vacation`) — שורה חסרה משמעה `normal` |
| `shifts` | משמרות שנשמרו לכל משתמש, עם התאריך על כל שורה לצורך שאילתות ישירות |

שלוש הטבלאות מוגנות באמצעות Row Level Security של Postgres: כל משתמש יכול לקרוא ולכתוב רק את השורות שלו. הסכמה נמצאת ב-`supabase/migrations/`.

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
flowchart TD
  subgraph group_presentation["Presentation"]
    layer_presentation["User experience"]
  end

  subgraph group_application["Application"]
    layer_application["Composition, routing and state"]
  end

  subgraph group_domain["Domain"]
    layer_domain["Payroll calculation"]
  end

  subgraph group_data["Infrastructure and data"]
    layer_data["Services, adapters and persistence"]
  end

  layer_presentation --> layer_application
  layer_application --> layer_domain
  layer_application --> layer_data

  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class layer_presentation toneBlue
  class layer_application toneMint
  class layer_domain toneAmber
  class layer_data toneRose
```

</details>

## שכבות מערכת

### דומיין
<details>
<summary>Domain</summary>

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
flowchart TD
  subgraph group_domain["Payroll domain"]
    node_composition["Domain composition<br/>[composition.ts]"]
    node_shiftbuilder["Shift map builder<br/>[shiftmap.builder.ts]"]
    node_daybuilder["Day pay builder<br/>[daypaymap.builder.ts]"]
    node_timeline["Timeline classification<br/>[classify-shift-timeline.ts]"]
    node_calculators["Pay calculators<br/>[buildCalculators.pipeline.ts]"]
    node_monthreducer["Month pay reducers<br/>[month-pay-map.reducer.ts]"]
    node_resolvers["Resolvers<br/>[month.resolver.ts]"]
    node_services["Domain services<br/>[shift.service.ts]"]
  end

  node_composition -->|"assembles"| node_shiftbuilder
  node_composition -->|"assembles"| node_daybuilder
  node_composition -->|"assembles"| node_calculators
  node_shiftbuilder -->|"classifies timeline"| node_timeline
  node_shiftbuilder -->|"uses"| node_calculators
  node_daybuilder -->|"uses"| node_calculators
  node_daybuilder -->|"resolves"| node_resolvers
  node_monthreducer -->|"uses"| node_calculators
  node_resolvers -->|"uses"| node_services
  node_monthreducer -->|"aggregates"| node_resolvers

  click node_composition "https://github.com/dmaman86/shiftly/blob/main/src/domain/composition.ts"
  click node_shiftbuilder "https://github.com/dmaman86/shiftly/blob/main/src/domain/builder/shiftmap.builder.ts"
  click node_daybuilder "https://github.com/dmaman86/shiftly/blob/main/src/domain/builder/daypaymap.builder.ts"
  click node_timeline "https://github.com/dmaman86/shiftly/blob/main/src/domain/timeline/classify-shift-timeline.ts"
  click node_calculators "https://github.com/dmaman86/shiftly/blob/main/src/domain/pipelines/buildCalculators.pipeline.ts"
  click node_monthreducer "https://github.com/dmaman86/shiftly/blob/main/src/domain/reducer/month-pay-map.reducer.ts"
  click node_resolvers "https://github.com/dmaman86/shiftly/blob/main/src/domain/resolve/month.resolver.ts"
  click node_services "https://github.com/dmaman86/shiftly/blob/main/src/domain/services/shift.service.ts"

  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  class node_composition,node_shiftbuilder,node_daybuilder,node_timeline,node_calculators,node_monthreducer,node_resolvers,node_services toneAmber
```

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
  חיבור מרכזי של רכיבי הדומיין דרך `pipelines/`. ה־API הציבורי של הדומיין מורכב ב־`src/domain/composition.ts` ונחשף לאפליקציה דרך `src/app/domain/domain.instance.ts`.

\n\n

### תצוגה
<details>
<summary>Presentation</summary>

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
flowchart TD
  subgraph group_ui["User experience"]
    node_app["Application shell<br/>[App.tsx]"]
    node_routes["Application routes<br/>[AppRoutes.tsx]"]
    node_daily["Daily page<br/>[DailyPage.tsx]"]
    node_monthly["Monthly summary<br/>[MonthlySummaryPage.tsx]"]
    node_rules["Calculation rules<br/>[CalculationRulesPage.tsx]"]
    node_worktable["Work table<br/>[WorkTable.tsx]"]
    node_daycontroller["Day controller<br/>[useDayController.ts]"]
    node_salary["Salary summary<br/>[MonthlySalarySummary.tsx]"]
    node_dayviews["Day pay breakdown<br/>[dayToPayBreadownVM.ts]"]
    node_monthbreakdown["Month pay breakdown<br/>[monthToPayBreakdownVM.ts]"]
  end

  node_app -->|"renders"| node_routes
  node_routes -->|"routes to"| node_daily
  node_routes -->|"routes to"| node_monthly
  node_routes -->|"routes to"| node_rules
  node_daily -->|"presents"| node_worktable
  node_worktable -->|"delegates day interactions"| node_daycontroller
  node_daycontroller -->|"maps"| node_dayviews
  node_monthly -->|"shows totals"| node_salary
  node_monthly -->|"maps monthly pay"| node_monthbreakdown

  click node_app "https://github.com/dmaman86/shiftly/blob/main/src/app/App.tsx"
  click node_routes "https://github.com/dmaman86/shiftly/blob/main/src/app/routes/AppRoutes.tsx"
  click node_daily "https://github.com/dmaman86/shiftly/blob/main/src/pages/DailyPage.tsx"
  click node_monthly "https://github.com/dmaman86/shiftly/blob/main/src/pages/MonthlySummaryPage.tsx"
  click node_rules "https://github.com/dmaman86/shiftly/blob/main/src/pages/CalculationRulesPage.tsx"
  click node_worktable "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/components/month/WorkTable.tsx"
  click node_daycontroller "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/hooks/day/useDayController.ts"
  click node_salary "https://github.com/dmaman86/shiftly/blob/main/src/features/salary-summary/components/MonthlySalarySummary.tsx"
  click node_dayviews "https://github.com/dmaman86/shiftly/blob/main/src/adapters/dayToPayBreadownVM.ts"
  click node_monthbreakdown "https://github.com/dmaman86/shiftly/blob/main/src/adapters/monthToPayBreakdownVM.ts"

  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  class node_app,node_routes,node_daily,node_monthly,node_rules,node_worktable,node_daycontroller,node_salary,node_dayviews,node_monthbreakdown toneBlue
```

</details>

#### טיפוסי האפליקציה וה־UI
`src/app/` הוא שורש ההרכבה של האפליקציה. הוא יוצר את מופע הדומיין המורכב ומנגיש ל־React פעולות דומיין בלי לייבא ישירות פונקציות תזמור. לדוגמה, קוד האפליקציה קורא ל־`domain.payMap.calculateDayFromShifts(...)`.

חוזי הדומיין נשארים תחת `src/domain/types`. מודלים המיועדים ל־UI, כגון `PayBreakdownViewModel`, `CompactPayBreakdownVM` ו־`WorkDayInfo`, נמצאים תחת `src/app/types`, משום שהם מתארים תצוגה ומצב אפליקטיבי ולא חוקי דומיין. Adapters וממפים של ה־features ממירים תוצאות דומיין למודלים האלו.

\n\n

#### Hooks
שכבת תיאום דקה בין ה-UI, הדומיין וה-state.
אינה מכילה לוגיקה עסקית.

\n\n

#### רכיבי UI
רכיבי תצוגה בלבד.
ה-UI מגיב לנתונים מחושבים ואינם מכיל חוקי שכר.

---

### אפליקציה
<details>
<summary>Application</summary>

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
flowchart TD
  subgraph group_composition["Application composition"]
    node_domaininstance["Domain instance<br/>[domain.instance.ts]"]
    node_providers["Application providers<br/>[AppProviders.tsx]"]
    node_auth["Authentication provider<br/>[AuthProvider.tsx]"]
    node_domainprovider["Domain provider<br/>[DomainProvider.tsx]"]
  end

  subgraph group_state["Application state"]
    node_monthlydata["Monthly data provider<br/>[MonthlyDataProvider.tsx]"]
    node_session["Month session<br/>[useWorkTableMonthSession.ts]"]
    node_daystate["Day-state context<br/>[WorkTableDayStateProvider.tsx]"]
    node_globalstate["Global state<br/>[globalStore.ts]"]
  end

  node_providers -->|"installs"| node_auth
  node_providers -->|"installs"| node_domainprovider
  node_domainprovider -->|"exposes"| node_domaininstance
  node_monthlydata -->|"coordinates"| node_session
  node_session -->|"reads user"| node_auth
  node_session -->|"hydrates and observes"| node_daystate
  node_session -->|"replaces pay maps"| node_globalstate
  node_daystate -->|"updates"| node_globalstate
  node_domaininstance -->|"serves domain operations"| node_session

  click node_domaininstance "https://github.com/dmaman86/shiftly/blob/main/src/app/domain/domain.instance.ts"
  click node_providers "https://github.com/dmaman86/shiftly/blob/main/src/app/providers/AppProviders.tsx"
  click node_auth "https://github.com/dmaman86/shiftly/blob/main/src/app/providers/auth/AuthProvider.tsx"
  click node_domainprovider "https://github.com/dmaman86/shiftly/blob/main/src/app/providers/domain/DomainProvider.tsx"
  click node_monthlydata "https://github.com/dmaman86/shiftly/blob/main/src/features/monthly-data/MonthlyDataProvider.tsx"
  click node_session "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/hooks/month/useWorkTableMonthSession.ts"
  click node_daystate "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/context/workTableDayState/WorkTableDayStateProvider.tsx"
  click node_globalstate "https://github.com/dmaman86/shiftly/blob/main/src/store/globalStore.ts"

  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  class node_domaininstance,node_providers,node_auth,node_domainprovider,node_monthlydata,node_session,node_daystate,node_globalstate toneMint
```

</details>

#### ניהול מצב
- **Zustand** מנהל את הגדרות התקופה הגלובליות ואת מפות השכר היומיות
- **React Context** מחזיק אימות, הזרקת תלויות, גבולות אינטגרציה ואת מצב העריכה הנוכחי של טבלת העבודה
- **TanStack Query** מתאם קריאות וכתיבות מאומתות של טבלת העבודה מול Supabase
- מפות השכר היומיות מתעדכנות לפי תאריך, והפירוט החודשי נגזר באופן דטרמיניסטי מהמפות הנוכחיות

מצב Zustand גלובלי:

- `src/store/globalStore.ts`
- `src/store/globalBreakdown.ts`

### נתונים
<details>
<summary>Data</summary>

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
flowchart TD
  subgraph group_services["Services and integrations"]
    node_shiftservice["Shift service<br/>[shift.service.ts]"]
    node_workdayservice["Workday service<br/>[workDay.service.ts]"]
    node_monthlyconfig["Monthly config service<br/>[monthlyConfig.service.ts]"]
    node_account["Account service<br/>[account.service.ts]"]
    node_hebcal["Hebcal service<br/>[hebcal.service.ts]"]
    node_analytics["Analytics service<br/>[analytics.service.ts]"]
    node_supabase["Supabase client and CRUD<br/>[supabase.client.ts]"]
  end

  subgraph group_adapters["Adapters"]
    node_dayadapter["Day pay breakdown adapter<br/>[dayToPayBreadownVM.ts]"]
    node_monthadapter["Month pay breakdown adapter<br/>[monthToPayBreakdownVM.ts]"]
  end

  node_persistence[("Persisted application data")]
  node_hebcalapi{{"Hebcal API"}}

  node_shiftservice -->|"uses"| node_supabase
  node_workdayservice -->|"uses"| node_supabase
  node_monthlyconfig -->|"uses"| node_supabase
  node_account -->|"uses"| node_supabase
  node_supabase -->|"reads and writes"| node_persistence
  node_hebcal -->|"fetches holidays"| node_hebcalapi
  node_dayadapter -->|"maps domain output"| node_monthadapter
  node_analytics -->|"tracks application events"| node_supabase

  click node_shiftservice "https://github.com/dmaman86/shiftly/blob/main/src/services/shift/shift.service.ts"
  click node_workdayservice "https://github.com/dmaman86/shiftly/blob/main/src/services/workDay/workDay.service.ts"
  click node_monthlyconfig "https://github.com/dmaman86/shiftly/blob/main/src/services/monthlyConfig/monthlyConfig.service.ts"
  click node_account "https://github.com/dmaman86/shiftly/blob/main/src/services/account/account.service.ts"
  click node_hebcal "https://github.com/dmaman86/shiftly/blob/main/src/services/hebcal/hebcal.service.ts"
  click node_analytics "https://github.com/dmaman86/shiftly/blob/main/src/services/analytics/analytics.service.ts"
  click node_supabase "https://github.com/dmaman86/shiftly/blob/main/src/services/supabase/supabase.client.ts"
  click node_dayadapter "https://github.com/dmaman86/shiftly/blob/main/src/adapters/dayToPayBreadownVM.ts"
  click node_monthadapter "https://github.com/dmaman86/shiftly/blob/main/src/adapters/monthToPayBreakdownVM.ts"

  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
  class node_shiftservice,node_workdayservice,node_monthlyconfig,node_account,node_hebcal,node_analytics,node_supabase toneRose
  class node_dayadapter,node_monthadapter,node_persistence,node_hebcalapi toneNeutral
```

</details>

#### Adapters
המרת אובייקטי דומיין למודלי תצוגה עבור ה-UI, תוך שמירה על ניתוק מלא מהדומיין.

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
- **סיווג סוג יום לפי חג**: מבוסס Hebcal

ההתקדמות הבסיסית נצברת לאורך היום לפי ההגדרות `standardHours` ו־`midTierThreshold`: ברירת המחדל היא בדרך כלל 8 שעות תקן ושעתיים בדרגת הביניים. השעות הראשונות מחושבות ב־100%, הדרגה הבאה ב־125%, והיתרה ב־150%. גבולות שנוצרו על ידי סיווג הציר, חצות או זמן מיוחד אינם מאפסים את ההתקדמות. התוספות `+20%` ו־`+50%` מחושבות בנפרד באמצעות policy המבוססת על תאריך, כולל כלל זכאות של שלוש שעות כאשר הוא חל.

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

- `buildCoreServices`: שירותי תאריך ומשמרת
- `buildResolvers`: מופעי Resolver חודש ומידע יום עבודה
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
- **Hebcal API** (זיהוי חגים)
- **Supabase** 2.112.4 (התחברות Google + שמירת נתונים ב-Postgres)

### בדיקות

- **Vitest** 4
- **Testing Library** (React, Jest-DOM, User Event)
- **Playwright** 1.63 (בדיקות מקצה לקצה בדפדפן Chromium)

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
├── scripts/
│   └── architecture/           # מחוללי תרשימי Mermaid
├── src/
│   ├── adapters/               # מתאמי מידע חיצוני והמרה מהדומיין לתצוגה
│   ├── app/                    # שורש ההרכבה של האפליקציה
│   │   ├── domain/             # מופע הדומיין וטיפוסים לשכבת האפליקציה
│   │   ├── types/              # מודלים לשכבת האפליקציה ול־UI
│   │   ├── providers/          # ספקי אימות, כיוון, דומיין והתראות
│   │   └── routes/             # ניתוב האפליקציה וניתוב מותאם שפה
│   ├── constants/              # קבועי דומיין וממשק משותפים
│   ├── components/             # רכיבי ממשק משותפים להצגה
│   ├── domain/                 # כללי שכר בלתי תלויים בפריימוורק
│   │   ├── builder/            # בניית מבני משמרת, יום וחודש
│   │   ├── calculator/         # pipelines של ציר זמן, שעות בסיס, תוספות, תעריפים וזכויות
│   │   ├── pipelines/          # הרכבת תלויות הדומיין
│   │   ├── reducer/            # צבירה חודשית והפחתה
│   │   ├── resolve/            # שירותי החלטה מרובי-מתודות (סוג יום, חודש)
│   │   ├── services/           # שירותי תאריך ומשמרת
│   │   └── types/              # חוזי דומיין ומבני מידע
│   ├── features/               # ממשק ותיאום בבעלות כל פיצ'ר
│   │   ├── auth/               # פקדי התחברות Google
│   │   ├── calculation-rules/  # כללים ודוגמת חישוב אינטראקטיבית
│   │   ├── config/             # פרמטרי עבודה ושמירת תצורה חודשית
│   │   ├── feedback/           # התראות ומשוב למשתמש
│   │   ├── info-dialog/        # חלון מידע על האפליקציה
│   │   ├── monthly-data/       # טעינה ושמירה של תצורה חודשית
│   │   ├── monthly-pay/        # שכר חודשי מחושב והקצאת זיכוי שבת
│   │   │   └── hooks/          # חישוב הקצאה ושמירת העברה
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
│   ├── pages/                  # עמודים יומיים, חודשיים וכללי חישוב
│   ├── store/                  # מצב גלובלי באמצעות Zustand וחישובי פירוט
│   ├── services/               # לקוחות Analytics, Hebcal ושמירת Supabase
│   ├── test/                   # בדיקות דומיין, store, שירותים וממשק
│   └── utils/                  # טיפול בתוצאות API וכלי עזר משותפים
└── supabase/
    ├── functions/               # Edge Functions מאומתות
    └── migrations/              # סכמת Postgres ומדיניות Row Level Security
```

---

## התנהגות ממשק המשתמש

## תצוגות מערכת

Shiftly כוללת שתי תצוגות חישוב עיקריות:

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
npm run test

# הרצת בדיקות עם ממשק UI
npm run test:ui

# הרצת בדיקות עם כיסוי קוד
npm run test:coverage

# הרצת בדיקות במצב CI (הרצה חד־פעמית)
npm run test:ci
```

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
npm run test:e2e

# פתיחת ממשק Playwright
npm run test:e2e:ui

# הרצה עם דפדפן גלוי
npm run test:e2e:headed
```

תרחישי החודש המלאים (קובצי הקלט והתוצאות הצפויות) נמצאים תחת:

```text
e2e/
├── fixtures/
│   ├── august-2026.json / august-2026.result.json
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

כל ה־fixtures נבדקים בבדיקת האינטגרציה של Vitest `src/test/integration/work-table-month-fixtures.test.ts`, שמריצה את אותו מסלול חישוב של האפליקציה ללא דפדפן. Playwright מריץ דרך הממשק רק את תרחיש אוגוסט 2026.

מקומית, שרת ה־E2E מפעיל את שרת הפיתוח של Vite על `127.0.0.1` עם נתיב הבסיס `/shiftly`. ב־CI הוא מגיש את `dist/` המוכן מראש באמצעות `vite preview`. שירות Hebcal מדומה בבדיקות כדי לשמור על תרחישים דטרמיניסטיים.
ה־workflow של ה־CI מתקין Chromium ו־WebKit ומריץ את חבילת בדיקות ה־E2E באופן אוטומטי.

### בדיקות איכות ובניית גרסת Production

```bash
# בדיקת טיפוסים של האפליקציה ושל הגדרות Vite
npm run typecheck

# הרצת ניתוח סטטי
npm run lint

# יצירת חבילת production בתיקייה dist/
npm run build
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
npm install
npm run dev

# מנהל חבילות חלופי:
# bun install --frozen-lockfile
# bun run dev
```

כניסה ל־`http://localhost:5173/shiftly` בדפדפן.

### הגדרת Supabase (אופציונלי)

מצב אורח עובד בלי שום הגדרה — שום דבר לא נשמר, ואין צורך בחשבון.

כדי להפעיל התחברות עם Google ושמירת נתונים בין מכשירים, צרו קובץ `.env.local` עם פרטי הפרויקט שלכם ב-Supabase:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

לאחר מכן הריצו את קבצי ה-SQL תחת `supabase/migrations/`, לפי הסדר, ב-SQL Editor של פרויקט ה-Supabase שלכם, כדי ליצור את הטבלאות `monthly_configs`, `work_days` ו-`shifts` עם מדיניות ה-Row Level Security שלהן.

מחיקת חשבון דורשת את Supabase Edge Function בשם `delete-account`, כי מחיקה מ-`auth.users` דורשת מפתח סודי בצד שרת. לאחר קישור הפרויקט, פרסו אותה כך:

```bash
supabase functions deploy delete-account
```

הפונקציה מאמתת את ה-JWT של המשתמש המחובר ומוחקת את אותו משתמש מ-Supabase Auth. מאחר שהטבלאות משתמשות ב-`on delete cascade`, הרשומות של המשתמש ב-`monthly_configs`, `work_days` ו-`shifts` נמחקות על ידי בסיס הנתונים.

---

## רישיון

הפרויקט מופץ תחת רישיון [MIT](../../LICENSE).

</div>
