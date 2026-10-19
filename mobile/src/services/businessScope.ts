import { CanceledError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
type ScopedConfig = InternalAxiosRequestConfig & { businessEpoch?: number };
export function createBusinessScope(api: AxiosInstance) {
  let businessId: number | null = null, epoch = 0;
  let denied = () => {};
  api.interceptors.request.use((config: ScopedConfig) => {
    if (/^\/(auth|businesses|invitations)(\/|$)/.test(config.url || "")) return config;
    if (config.businessEpoch !== undefined && config.businessEpoch !== epoch) throw new CanceledError("El negocio activo cambió");
    config.businessEpoch = epoch;
    if (businessId) config.headers.set("X-Business-Id", String(businessId));
    else config.headers.delete("X-Business-Id");
    return config;
  });
  api.interceptors.response.use(response => {
    const stamp = (response.config as ScopedConfig).businessEpoch;
    if (stamp !== undefined && stamp !== epoch) throw new CanceledError("El negocio activo cambió");
    return response;
  }, error => {
    if (error.response?.data?.error?.code === "BUSINESS_FORBIDDEN" && (error.config as ScopedConfig)?.businessEpoch === epoch) denied();
    return Promise.reject(error);
  });
  return { set(id: number | null) { businessId = id; epoch++; }, onDenied(callback: () => void) { denied = callback; } };
}
