import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import heCommon from "./locales/he/common.json";
import heErrors from "./locales/he/errors.json";
import hePages from "./locales/he/pages.json";
import heWorkTable from "./locales/he/work-table.json";

import enCommon from "./locales/en/common.json";
import enErrors from "./locales/en/errors.json";
import enPages from "./locales/en/pages.json";
import enWorkTable from "./locales/en/work-table.json";

const pathLang = window.location.pathname.split("/")[1];
const activeLanguage = pathLang === "en" ? "en" : "he";

i18n.use(initReactI18next).init({
  lng: activeLanguage,
  fallbackLng: "he",
  defaultNS: "common",
  ns: ["common", "errors", "pages", "work-table"],
  resources: {
    he: { common: heCommon, errors: heErrors, pages: hePages, "work-table": heWorkTable },
    en: { common: enCommon, errors: enErrors, pages: enPages, "work-table": enWorkTable },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
