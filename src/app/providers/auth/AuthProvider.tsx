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
    let receivedAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      receivedAuthEvent = true;
      setSession(nextSession);
      setInitializationError(null);
      setIsLoading(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted || receivedAuthEvent) return;

      if (error) {
        setInitializationError(error.message);
        setSession(null);
      } else {
        setSession(data.session);
      }

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
