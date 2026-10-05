import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks";
import { analyticsService } from "@/services";

export type NavLinkItem = { to: string; label: string };

// Single source for header links so the desktop and mobile variants cannot drift.
export const useNavigation = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, initializationError } = useAuth();
  /* v8 ignore next */
  const lang = location.pathname.split("/")[1] || "he";
  const showProfile = !isLoading && !initializationError;

  const items: NavLinkItem[] = [
    { to: `/${lang}/daily`, label: t("nav.daily") },
    { to: `/${lang}/monthly`, label: t("nav.monthly") },
    { to: `/${lang}/calculation-rules`, label: t("nav.calculation_rules") },
    ...(showProfile ? [{ to: `/${lang}/profile`, label: t("nav.profile") }] : []),
  ];

  const toggleLang = () => {
    const nextLang = lang === "he" ? "en" : "he";
    navigate(
      location.pathname.replace(`/${lang}/`, `/${nextLang}/`) + location.search,
    );
    analyticsService.track({
      name: "language_toggled",
      params: { lang: nextLang },
    });
  };

  return { homePath: `/${lang}/daily`, items, toggleLang };
};
