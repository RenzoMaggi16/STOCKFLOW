import { useCallback, useState, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "../services/api";
import { errorMessage } from "../services/session";
import { useBusiness } from "../contexts/BusinessContext";
import { useAuth } from "../contexts/AuthContext";
export function useResource<T = any>(url: string) {
  const { revision, active } = useBusiness();
  const { user } = useAuth();
  const enabled = !!user?.email_verificado && (/^\/(businesses|invitations)(\/|$)/.test(url) || !!active);
  const generation = useRef(0);
  const [scope, setScope] = useState(revision);
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const current = ++generation.current;
    setScope(revision);
    setData(null);
    if (!enabled) { setLoading(false); setError(""); return; }
    setLoading(true);
    setError("");
    try {
      const r = await api.get(url);
      if (current === generation.current) setData(r.data.data);
    } catch (e) {
      if (current === generation.current) setError(errorMessage(e));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [url, revision, enabled]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  return { data: scope === revision ? data : null, loading: scope !== revision || loading, error: scope === revision ? error : "", load };
}
