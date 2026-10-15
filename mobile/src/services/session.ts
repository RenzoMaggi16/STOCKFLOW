import {
  create,
  isAxiosError,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
export type Tokens = { accessToken: string; refreshToken: string };
export interface Storage {
  read(): Promise<Tokens | null>;
  write(tokens: Tokens | null): Promise<void>;
}
export function createSession(
  baseURL: string,
  storage: Storage,
  onLost: () => void,
) {
  const api = create({ baseURL, timeout: 15000 });
  const publicApi = create({ baseURL, timeout: 15000 });
  let tokens: Tokens | null = null;
  let flight: Promise<void> | null = null;
  let generation = 0;
  async function set(next: Tokens | null) {
    generation++;
    tokens = next;
    await storage.write(next);
  }
  async function refresh() {
    if (flight) return flight;
    const current = tokens;
    const stamp = generation;
    if (!current) throw new Error("Iniciá sesión");
    flight = (async () => {
      try {
        const { data } = await publicApi.post("/auth/refresh", {
          refreshToken: current.refreshToken,
        });
        if (stamp === generation) {
          tokens = data.data;
          await storage.write(tokens);
        }
      } catch (e) {
        if (
          stamp === generation &&
          isAxiosError(e) &&
          [401, 403].includes(e.response?.status || 0)
        ) {
          await set(null);
          onLost();
        }
        throw e;
      }
    })().finally(() => {
      flight = null;
    });
    return flight;
  }
  api.interceptors.request.use((config) => {
    if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    return config;
  });
  api.interceptors.response.use(
    (r) => r,
    async (e: AxiosError) => {
      const config = e.config as
        (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
      if (e.response?.status !== 401 || !config || config._retried || !tokens)
        throw e;
      config._retried = true;
      // Un 401 tardío de un token anterior no debe renovar otra vez.
      if (config.headers.Authorization === `Bearer ${tokens.accessToken}`)
        await refresh();
      if (!tokens) throw e;
      return api.request(config);
    },
  );
  return {
    api,
    publicApi,
    set,
    refresh,
    hasTokens: () => !!tokens,
    restore: async () => {
      tokens = await storage.read();
      return !!tokens;
    },
    logout: async () => {
      const old = tokens;
      await set(null);
      onLost();
      if (old)
        await publicApi.post("/auth/logout", {
          refreshToken: old.refreshToken,
        });
    },
  };
}
export function errorMessage(e: unknown) {
  if (isAxiosError(e))
    return (
      e.response?.data?.error?.details
        ?.map((issue: { message: string }) => issue.message)
        .join(" · ") ||
      e.response?.data?.error?.message ||
      (e.code === "ECONNABORTED"
        ? "La conexión tardó demasiado. Volvé a intentar."
        : "No se pudo conectar con StockFlow. Revisá la red y la dirección de la API.")
    );
  return e instanceof Error ? e.message : "Ocurrió un error";
}
