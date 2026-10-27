export const AUTH_OPERATION_TIMEOUT_MS = 20000;
export const ERP_AUTH_STORAGE_KEY = "sb-duaaijqbngltmlgbzrvt-auth-token";

export function createAuthFetch(authOrigin, fetcher = globalThis.fetch.bind(globalThis), timeoutMs = 12000) {
  return async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url || String(input);
    if (!url.startsWith(authOrigin + "/auth/v1/")) return fetcher(input, init);
    const controller = new AbortController();
    const upstream = init.signal || input?.signal;
    const abort = () => controller.abort(upstream?.reason);
    if (upstream?.aborted) abort();
    else upstream?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error("Login connection timed out")), timeoutMs);
    try {
      const response = await fetcher(input, { ...init, signal: controller.signal });
      const body = await response.arrayBuffer();
      return new Response([204, 205, 304].includes(response.status) ? null : body, {
        status: response.status, statusText: response.statusText, headers: response.headers
      });
    } finally {
      clearTimeout(timer);
      upstream?.removeEventListener("abort", abort);
    }
  };
}

export function resetErpLoginConnection() {
  const keys = [ERP_AUTH_STORAGE_KEY, ERP_AUTH_STORAGE_KEY + "-code-verifier", ERP_AUTH_STORAGE_KEY + "-user"];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of keys) storage.removeItem(key);
  }
  window.location.reload();
}
