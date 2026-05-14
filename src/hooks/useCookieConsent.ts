import { useState, useEffect } from "react";
import { gtagService } from "@/services";

const CONSENT_KEY = "cookie_consent";

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<boolean | null>(() => {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "true" ? true : v === "false" ? false : null;
  });

  useEffect(() => {
    gtagService.load();
  }, []);

  useEffect(() => {
    if (consent === true) {
      gtagService.grantConsent();
    }
  }, [consent]);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "true");
    setConsent(true);
  };

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, "false");
    setConsent(false);
  };

  return { consent, accept, reject };
};
