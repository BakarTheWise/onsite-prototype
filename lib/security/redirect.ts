export function safeInternalPath(path: string | null, fallback: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;

  try {
    const target = new URL(path, "https://onsite.invalid");
    if (target.origin !== "https://onsite.invalid") return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
