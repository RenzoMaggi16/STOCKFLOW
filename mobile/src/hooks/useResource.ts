import { useCallback, useState, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "../services/api";
import { errorMessage } from "../services/session";
export function useResource<T = any>(url: string) {
  const generation = useRef(0);
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const current = ++generation.current;
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
  }, [url]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  return { data, loading, error, load };
}
