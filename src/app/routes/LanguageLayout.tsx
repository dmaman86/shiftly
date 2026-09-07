import { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import i18n from "@/i18n";
import { isSupportedLanguage } from "@/i18n/language";
import { useDirection } from "@/hooks";

export const LanguageLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const { setDirection } = useDirection();

  const isValid = isSupportedLanguage(lang);

  useEffect(() => {
    if (!isSupportedLanguage(lang)) return;
    setDirection(lang === "en" ? "ltr" : "rtl");
    void i18n.changeLanguage(lang);
  }, [lang, isValid, setDirection]);

  if (!isValid) return <Navigate to="/he/daily" replace />;

  return <Outlet />;
};
