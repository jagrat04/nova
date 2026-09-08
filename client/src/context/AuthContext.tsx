import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "../lib/api";
import type { User } from "../lib/types";

interface AuthResponse {
  user: User;
  token: string;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  title?: string;
}

interface AuthContextValue {
  user: User | null;
  /** "loading" until the stored token has been checked against the API. */
  status: "loading" | "authenticated" | "guest";
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const queryClient = useQueryClient();

  // Restore the session on first load so a refresh does not sign the user out.
  useEffect(() => {
    if (!tokenStore.get()) {
      setStatus("guest");
      return;
    }
    api
      .get<{ user: User }>("/auth/me")
      .then(({ user: me }) => {
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        tokenStore.clear();
        setStatus("guest");
      });
  }, []);

  const handleAuth = useCallback(({ user: nextUser, token }: AuthResponse) => {
    tokenStore.set(token);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      handleAuth(await api.post<AuthResponse>("/auth/login", { email, password }));
    },
    [handleAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      handleAuth(await api.post<AuthResponse>("/auth/register", input));
    },
    [handleAuth],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("guest");
    // Drop cached project data so the next account does not see it.
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, status, login, register, logout, setUser }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
