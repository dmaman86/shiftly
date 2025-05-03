# Shiftly – Work Hours Tracking & Calculation System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-blue)](https://dmaman86.github.io/shiftly/)

**Shiftly** is an advanced work-hour tracking tool that calculates wages based on complex Israeli labor laws, including overtime, night bonuses, and special day rates (Shabbat, holidays, Friday evenings). Built with **React** and **TypeScript**, it provides a visual and editable breakdown for each workday.

## Features

- Track start and end time for each work shift
- Automatically calculates:
  - Base hours (100%)
  - Overtime:
    - 125% after 8 hours
    - 150% after 10 hours
  - Evening bonus (20%)
  - Night bonus (50%)
  - Special pay:
    - Friday evenings and Shabbat (150% + 100%)
    - Holidays and holiday evenings (up to 200% + 100%)
- Distinction between normal, sick, and vacation days
- Editable segments for manual adjustments
- Visual breakdown table per day and summary per month

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Material UI (MUI) + Bootstrap
- **State Management**: Custom React Hooks
- **Date handling**: [Hebcal API](https://www.hebcal.com/home/developer-apis) for holidays

## Getting Started

To run the app locally:

```bash
git clone https://github.com/dmaman86/shiftly.git
cd shiftly
npm install
npm run dev
```

Visit `http://localhost:5173/shiftly` in your browser.

## Project Structure

```plaintext
src/
├── assets/
├── components/
│   ├── BreakdownSummary.tsx
│   ├── ConfigPanel.tsx
│   ├── FooterSummary.tsx
│   ├── MonthlySalarySummary.tsx
│   ├── WorkDayRow.tsx
│   └── WorkTable.tsx
├── hooks/
│   ├── useSegments.ts
│   └── useWorkDays.ts
├── models/
│   └── work_day_row.ts
├── utility/
│   ├── breakdownUtil.ts
│   └── workDayBreakdown.ts
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

## Interface Preview

### Workday Overview

- If `baseRate` is **not set**: only worked hours are displayed per day in the monthly summary. No daily wage (שכר יומי) or salary table is shown.
- If `baseRate` is **set**: each day includes a daily wage (שכר יומי) and a monthly summary appears below the table.

### Day Configuration Logic

**Shabbat or Holiday - Work Hours Allowed**

- Cannot mark as Sick/Vacation, but work segments are allowed.
  ![Shabbat Sick Vacation Example](./public/shabbat-sick-vacation.png)
  ![Shabbat Hours Example](./public/shabbat-hours.png)

**Friday or Holiday Eve - Sick/Vacation or Work**

- Can mark as Sick/Vacation, or add work hours.
  ![Friday Sick Vacation Example](./public/friday-sick-vacation.png)
  ![Friday Hours Example](./public/friday-hours.png)

**Sick Day Or Vacation Day - Not Work Segments**

- Marked as Sick/Vacation; nor work segments allowed.
  ![Sick Select Example](./public/sick-day-select.png)
  ![Vacation Select Example](./public/vacation-day-select.png)

**Cross-Day Shift - "חוצה יום" Checkbox**

- End time is next day; system asks to confirm crossing day.
  ![Cross Day Warning](./public/cross-day-warning.png)
  ![Cross Day Checkbox](./public/cross-day-checkbox.png)
  ![Cross Day](./public/shift-save.png)

- **Day types**:

  - **Shabbat and holidays** are locked days: they cannot be marked as Sick or Vacation, but working hours **can** still be added.
  - **Fridays and holiday eves** allow marking the day as **Sick** or **Vacation**, or adding working segments.

- **Sick/Vacation behavior**:

  - When a day is marked as Sick or Vacation, you cannot add any work hours.

- **Working day behavior**:

  - If not marked as Sick or Vacation, you can add working segments with **start** and **end** times.
  - if the end time crosses midnight (into the next day), a checkbox appears: **"חוצה יום"** (crosses to next day).

- RTL layout for Hebrew.
- Configurable salary inputs.
- Daily work rows + sick/vacation toggles.
- Monthly salary summary table.

## License

This project is licensed under the [MIT License](LICENSE).
