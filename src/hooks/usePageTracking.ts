import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analyticsService } from "@/services";

export const usePageTracking = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const lang = pathname.split("/")[1] as "he" | "en";
    analyticsService.track({
      name: "page_view",
      params: {
        page_path: pathname,
        lang,
      },
    });
  }, [pathname]);
};
