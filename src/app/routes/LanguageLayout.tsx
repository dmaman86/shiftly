import { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import i18n from "@/i18n";
import { useDirection } from "@/hooks";

const SUPPORTED_LANGS = ["he", "en"] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

export const LanguageLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const { setDirection } = useDirection();

  const isValid = SUPPORTED_LANGS.includes(lang as Lang);

  useEffect(() => {
    if (!isValid) return;
    setDirection(lang === "en" ? "ltr" : "rtl");
    i18n.changeLanguage(lang!);
  }, [lang, isValid, setDirection]);

  if (!isValid) return <Navigate to="/he/daily" replace />;

  return <Outlet />;
};
