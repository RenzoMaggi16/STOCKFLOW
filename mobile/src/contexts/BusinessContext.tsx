import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api, onBusinessDenied, setBusinessScope } from "../services/api";
import { errorMessage } from "../services/session";
import { useAuth } from "./AuthContext";
export type Business = { id: number; nombre: string; rubro?: string; descripcion?: string; rol: "admin" | "encargado" | "empleado" };
type ContextValue = { businesses: Business[]; active: Business | null; role: string; loading: boolean; error: string; revision: number; refresh: () => Promise<Business[]>; select: (id: number) => Promise<void>; clear: () => void };
const Context = createContext<ContextValue>(null!);
export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id, verified = user?.email_verificado;
  const [loadedUser, setLoadedUser] = useState<number | undefined>(undefined);
  const [businesses, setBusinesses] = useState<Business[]>([]), [active, setActive] = useState<Business | null>(null), [loading, setLoading] = useState(true), [error,setError] = useState(""), [revision,setRevision] = useState(0);
  const current = useRef<Business | null>(null), sequence = useRef(0);
  const install = useCallback((next: Business | null) => {
    if (current.current?.id !== next?.id || current.current?.rol !== next?.rol) {
      setBusinessScope(next?.id ?? null);
      setRevision(v => v + 1);
    }
    current.current = next;
    setActive(next);
  }, []);
  const clear = useCallback(() => { sequence.current++; setLoading(false); install(null); }, [install]);
  const refresh = useCallback(async () => {
    const stamp = ++sequence.current;
    setLoading(true); setError("");
    try {
      if (!userId || !verified) { setLoadedUser(userId); setBusinesses([]); install(null); return []; }
      const response = await api.get("/businesses");
      const items: Business[] = response.data.data.items;
      if (stamp !== sequence.current) return [];
      setLoadedUser(userId);
      setBusinesses(items);
      // Conserva la selección solo dentro de la misma sesión. Un único negocio entra directo.
      install(items.find(b => b.id === current.current?.id) ?? (items.length === 1 ? items[0] : null));
      return items;
    } catch (e) {
      if (stamp === sequence.current) { setLoadedUser(userId); install(null); setError(errorMessage(e)); }
      return [];
    } finally { if (stamp === sequence.current) setLoading(false); }
  }, [userId, verified, install]);
  const select = useCallback(async (id: number) => {
    const stamp = ++sequence.current;
    setLoading(true); install(null);
    try {
      const response = await api.get(`/businesses/${id}`);
      if (stamp === sequence.current) install(response.data.data);
    } catch (e) { if (stamp === sequence.current) setError(errorMessage(e)); throw e; }
    finally { if (stamp === sequence.current) setLoading(false); }
  }, [install]);
  useEffect(() => {
    let mounted = true;
    const requests = sequence;
    current.current = null; setBusinessScope(null);
    void Promise.resolve().then(() => { if (mounted) return refresh(); });
    return () => { mounted = false; requests.current++; setBusinessScope(null); };
  }, [refresh]);
  useEffect(() => {
    onBusinessDenied(clear);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => { onBusinessDenied(() => {}); listener.remove(); };
  }, [clear, refresh]);
  const sameUser = loadedUser === userId;
  return <Context.Provider value={{ businesses: sameUser ? businesses : [], active: verified && sameUser ? active : null, role: sameUser ? active?.rol || "" : "", loading: loading || !sameUser, error, revision, refresh, select, clear }}>{children}</Context.Provider>;
}
export const useBusiness = () => useContext(Context);
