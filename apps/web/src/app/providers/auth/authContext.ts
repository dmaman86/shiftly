import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  initializationError: string | null;
  // A failed OAuth return. Unlike initializationError it leaves guest mode
  // usable: the visitor can keep working and retry the sign-in.
  signInError: string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
