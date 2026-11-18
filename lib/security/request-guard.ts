const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isTrustedHost(host: string | null, appOrigin: string) {
  if (!host) return false;

  try {
    return host.trim().toLowerCase() === new URL(appOrigin).host.toLowerCase();
  } catch {
    return false;
  }
}

export function isTrustedRequest(method: string, origin: string | null, appOrigin: string) {
  if (!origin) return !unsafeMethods.has(method.toUpperCase());
  if (origin === "null") return false;

  try {
    return new URL(origin).origin === new URL(appOrigin).origin;
  } catch {
    return false;
  }
}
