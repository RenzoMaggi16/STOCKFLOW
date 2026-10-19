import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AppState } from "react-native";
import { api, session, onSessionLost } from "../services/api";
import { errorMessage } from "../services/session";
export type User = {
  id: number;
  nombre: string;
  email: string;
  email_verificado: boolean;
  segundo_factor: boolean;
};
type Auth = {
  user: User | null;
  loading: boolean;
  error: string;
  pendingMfa: string;
  accept: (data: any) => Promise<void>;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [pendingMfa, setMfa] = useState("");
  const reload = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.data);
  }, []);
  async function restore() {
    setLoading(true);
    setError("");
    try {
      if (await session.restore()) await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  async function accept(data: any) {
    if (data.requiresMfa) {
      setMfa(data.challengeId);
      return;
    }
    await session.set(data);
    setUser(data.user);
    setMfa("");
    setError("");
  }
  async function logout() {
    setMfa("");
    await session.logout();
  }
  useEffect(() => {
    onSessionLost(() => setUser(null));
    let active = true;
    session
      .restore()
      .then(async (exists) => {
        if (exists && active) await reload();
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && session.hasTokens())
        void reload().catch(() => {});
    });
    return () => {
      active = false;
      listener.remove();
      onSessionLost(() => {});
    };
  }, [reload]);
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        pendingMfa,
        accept,
        reload,
        logout,
        restore,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
