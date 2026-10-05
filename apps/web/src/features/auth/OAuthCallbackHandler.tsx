import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAppSnackbar, useAuth } from "@/hooks";
import { hasOAuthCallbackParams } from "@/services/supabase/oauthCallback";
import { startedFromOAuthCallback } from "@/services/supabase/supabase.client";
import { oauthReturnPath } from "./oauthReturn";

/**
 * Finishes an OAuth return once auth-js has processed the URL: restores the
 * page the sign-in started from (which also drops any leftover tokens from the
 * address bar) and reports a failed callback instead of silently falling back
 * to guest mode.
 */
export const OAuthCallbackHandler = () => {
  const { isLoading, signInError } = useAuth();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const snackbar = useAppSnackbar();
  const { t } = useTranslation();
  const targetRef = useRef<string | null>(null);

  useEffect(() => {
    // Waiting for isLoading matters: navigating earlier would drop the
    // fragment before auth-js has exchanged it for a session.
    if (!startedFromOAuthCallback || isLoading) return;

    if (targetRef.current === null) {
      targetRef.current = oauthReturnPath.consume() ?? pathname;
      if (signInError) snackbar.error(t("auth.sign_in_error"));
    } else {
      // Routes mount in the same commit auth settles, and their redirects
      // forward the hash they rendered with. One of them can land after this
      // navigation and put the callback tokens back, so the target is
      // re-applied for as long as the URL still carries them.
      const href = new URL(
        `${pathname}${search}${hash}`,
        window.location.origin,
      ).href;
      if (!hasOAuthCallbackParams(href)) return;
    }

    navigate(targetRef.current, { replace: true });
  }, [hash, isLoading, navigate, pathname, search, signInError, snackbar, t]);

  return null;
};
