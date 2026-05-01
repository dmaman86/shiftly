import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analyticsService } from "@/services";

const VALID_LANGS = ["he", "en"] as const;
type Lang = (typeof VALID_LANGS)[number];

export const usePageTracking = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const lang = pathname.split("/")[1];
    if (!VALID_LANGS.includes(lang as Lang)) return;

    analyticsService.track({
      name: "page_view",
      params: { page_path: pathname, lang: lang as Lang },
    });
  }, [pathname]);
};
