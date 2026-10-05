import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  startedFromOAuthCallback,
  supabase,
} from "@/services/supabase/supabase.client";
import { AuthContext, type AuthContextValue } from "./authContext";

type AuthProviderProps = {
  children: React.ReactNode;
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [signInError, setSignInError] = useState<string | null>(null);

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
      if (nextSession) setSignInError(null);
      if (isInitialized.value) {
        setInitializationError(null);
        setIsLoading(false);
      }
    });

    const loadInitialSession = async () => {
      // initialize() is the only API that returns the error of a failed OAuth
      // callback; getSession() resolves it as a signed-out visit. Both share
      // the client's single initialization, so StrictMode re-runs are safe.
      const { error: callbackError } = await supabase.auth.initialize();
      const { data, error } = await supabase.auth.getSession();
      return { callbackError, session: data.session, error };
    };

    void loadInitialSession()
      .then(({ callbackError, session: storedSession, error }) => {
        if (!isMounted) return;

        if (callbackError) {
          console.error("Supabase auth initialization failed", callbackError);
          if (startedFromOAuthCallback) setSignInError(callbackError.message);
        }

        if (error) {
          setInitializationError(error.message);
          if (latestAuthEvent.value === undefined) setSession(null);
        } else {
          setSession(latestAuthEvent.value ?? storedSession);
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) return;

        console.error("Supabase auth initialization threw", error);
        if (startedFromOAuthCallback) setSignInError(toErrorMessage(error));
        else setInitializationError(toErrorMessage(error));
        if (latestAuthEvent.value === undefined) setSession(null);
      })
      .finally(() => {
        if (!isMounted) return;

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
      signInError,
    }),
    [session, isLoading, initializationError, signInError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
