import { api } from "@shared/routes";

export const getAuthToken = () => localStorage.getItem("auth_token");
export const setAuthToken = (token: string) => localStorage.setItem("auth_token", token);
export const clearAuthToken = () => localStorage.removeItem("auth_token");

export const BASE_URL = (() => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || 
                    hostname === "127.0.0.1" || 
                    hostname.startsWith("192.168.") || 
                    hostname.startsWith("10.") || 
                    hostname.startsWith("172.");
    if (isLocal) {
      return `http://${hostname}:5001`;
    }
    return window.location.origin;
  }
  return '';
})();

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Auto-set JSON content type if body is provided and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, { ...options, headers });

  // Don't auto-redirect on auth check endpoint - let component handle it
  // Only redirect on actual protected resource endpoints
  if (res.status === 401 && url !== api.auth.login.path && url !== api.auth.me.path) {
    clearAuthToken();
    window.location.href = "/login";
  }

  return res;
}

export function parseWithLogging<T>(schema: { safeParse: (data: unknown) => any }, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod Error] ${label} validation failed:`, result.error.format());
    throw new Error(`Validation failed for ${label}`);
  }
  return result.data as T;
}
