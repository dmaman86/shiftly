import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/services/supabase/supabase.client";
import { AuthContext, type AuthContextValue } from "./authContext";

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    const latestAuthEvent = { value: undefined as Session | null | undefined };
    const isInitialized = { value: false };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      latestAuthEvent.value = nextSession;
      setSession(nextSession);
      if (isInitialized.value) {
        setInitializationError(null);
        setIsLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;

      if (error) {
        setInitializationError(error.message);
        if (latestAuthEvent.value === undefined) setSession(null);
      } else {
        setSession(latestAuthEvent.value ?? data.session);
      }

      isInitialized.value = true;
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      initializationError,
    }),
    [session, isLoading, initializationError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
