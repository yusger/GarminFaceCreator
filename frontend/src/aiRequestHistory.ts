export const DESIGN_PROMPT_VERSION = "design-4-arc";
export const CHAT_PROMPT_VERSION = "chat-5-arc";
const KEY = "gfc-ai-request-history-v1";
const MAX_BYTES = 512 * 1024;
export type RequestSnapshot = {
  id: string;
  at: number;
  kind: string;
  promptVersion: string;
  capabilityVersion: string;
  model: string;
  endpoint: string;
  status: "pending" | "response" | "failed" | "cancelled";
  request: unknown;
  usage?: Record<string, number>;
  error?: string;
};
const memory: RequestSnapshot[] = [];
let memoryOnly = false;
function scrub(value: unknown, key: string, depth = 0): unknown {
  if (depth > 30) return "[TRUNCATED]";
  if (typeof value === "string")
    return (key ? value.replaceAll(key, "[REDACTED]") : value)
      .replace(/data:image\/[^\s"']+/gi, "[IMAGE OMITTED]")
      .replace(/\b(?:sk-|Bearer )[-A-Za-z0-9_.]{8,}/g, "[REDACTED]")
      .slice(0, 32000);
  if (Array.isArray(value))
    return value.slice(0, 100).map((v) => scrub(v, key, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) =>
            !/(?:authorization|api.?key|password|secret|access.?token)/i.test(
              k,
            ),
        )
        .map(([k, v]) => [
          k,
          k === "image_url" ? "[IMAGE OMITTED]" : scrub(v, key, depth + 1),
        ]),
    );
  return value;
}
export function readRequestHistory(): RequestSnapshot[] {
  if (memoryOnly) return [...memory];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.slice(-24) : [];
  } catch {
    return [...memory];
  }
}
function save(items: RequestSnapshot[]) {
  items = items.map((r) =>
    JSON.stringify(r).length > 100000
      ? {
          ...r,
          request: {
            omitted: true,
            reason: "Request exceeds per-entry metadata budget",
          },
        }
      : r,
  );
  while (items.length > 24 || JSON.stringify(items).length > MAX_BYTES / 2) {
    if (!items.length) break;
    items.shift();
  }
  memory.splice(0, memory.length, ...items);
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    memoryOnly = false;
  } catch {
    memoryOnly = true; /* Model request must survive browser storage failure. */
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("gfc-ai-requests"));
}
export function startRequestSnapshot(
  meta: Omit<RequestSnapshot, "id" | "at" | "status">,
  key: string,
): string {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  save([
    ...readRequestHistory(),
    scrub(
      { ...meta, id, at: Date.now(), status: "pending" },
      key,
    ) as RequestSnapshot,
  ]);
  return id;
}
export function finishRequestSnapshot(
  id: string,
  status: RequestSnapshot["status"],
  usage: unknown,
  error: string | undefined,
  key: string,
) {
  const safeUsage =
    usage && typeof usage === "object"
      ? Object.fromEntries(
          Object.entries(usage).filter(
            ([, v]) => typeof v === "number" && Number.isFinite(v) && v >= 0,
          ),
        )
      : undefined;
  save(
    readRequestHistory().map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            usage: safeUsage as Record<string, number> | undefined,
            error: scrub(error, key) as string | undefined,
          }
        : r,
    ),
  );
}
export function clearRequestHistory() {
  memory.length = 0;
  try {
    localStorage.removeItem(KEY);
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("gfc-ai-requests"));
}
