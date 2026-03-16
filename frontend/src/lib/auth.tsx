import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, getStoredToken, setStoredToken } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const meQuery = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: api.me,
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.isError) {
      setStoredToken(null);
      setToken(null);
      queryClient.removeQueries({ queryKey: ["auth", "me"] });
    }
  }, [meQuery.isError, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: meQuery.data ?? null,
      isAuthenticated: Boolean(token && meQuery.data),
      isLoading: Boolean(token) && meQuery.isLoading,
      setSession: (nextToken, user) => {
        setStoredToken(nextToken);
        setToken(nextToken);
        queryClient.setQueryData(["auth", "me", nextToken], user);
      },
      updateUser: (user) => {
        if (!token) return;
        queryClient.setQueryData(["auth", "me", token], user);
      },
      logout: () => {
        setStoredToken(null);
        setToken(null);
        queryClient.clear();
      },
    }),
    [meQuery.data, meQuery.isLoading, queryClient, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
};
