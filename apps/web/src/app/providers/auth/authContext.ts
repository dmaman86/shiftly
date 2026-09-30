import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  initializationError: string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
