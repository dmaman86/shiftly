import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export type InfoDialogKey = "about" | "disclaimer" | "privacy";

export type InfoDialogConfig = {
  title: string;
  icon: SvgIconComponent;
  paragraphs: string[];
};

export const INFO_DIALOG_CONTENT: Record<InfoDialogKey, InfoDialogConfig> = {
  about: {
    title: "אודות המערכת",
    icon: InfoOutlinedIcon,
    paragraphs: [
      "Shiftly היא מערכת לחישוב שעות עבודה ושכר, המיועדת לעובדי ביטחון שעתיים במשרדי ממשלה.",
      "המערכת משחזרת את לוגיקת החישוב כפי שהיא מופיעה בדוחות מערכת מרכבה, ומטרתה לאפשר סימולציה, בקרה והבנה של חישוב התלוש החודשי.",
      "התוצאה המוצגת היא שכר ברוטו, המחושב על סמך שעות עבודה בלבד.",
    ],
  },

  disclaimer: {
    title: "אחריות וחישוב",
    icon: GavelOutlinedIcon,
    paragraphs: [
      "החישוב המוצג במערכת הינו חישוב אינדיקטיבי בלבד.",
      "ייתכנו תרחישים בהם החישוב אינו תואם במלואו את התוצאה הרשמית, עקב חריגים, עדכונים או נתונים חסרים.",
      "המערכת אינה מהווה תחליף למערכת שכר רשמית או להנהלת חשבונות.",
    ],
  },

  privacy: {
    title: "פרטיות ושימוש בנתונים",
    icon: PrivacyTipOutlinedIcon,
    paragraphs: [
      "המערכת אינה שומרת מידע אישי, נתוני שכר, שעות עבודה או פרטי זיהוי של המשתמש.",
      "המערכת אינה מבצעת זיהוי משתמשים ואינה עושה שימוש בעוגיות לצורכי פרסום או מעקב חוצה אתרים.",
      "ייתכן שימוש בניתוח שימוש אנונימי ובסיסי בלבד (כגון צפיות בעמודים ואינטראקציות כלליות), לצורך שיפור בהירות החישוב וחוויית המשתמש.",
      "הנתונים הנאספים הם מצטברים ואינם מאפשרים זיהוי של אדם, תלוש או מקום עבודה ספציפי.",
    ],
  },
};
