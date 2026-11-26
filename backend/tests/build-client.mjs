// Test client preserves the one-time build credential without printing it.
const nativeFetch = globalThis.fetch;
const tokens = new Map();
export async function buildFetch(url, init = {}) {
  const parsed = new URL(url);
  const match = /^\/api\/builds\/([a-f0-9]{32})(?:\/|$)/i.exec(parsed.pathname);
  const headers = new Headers(init.headers);
  if (match && tokens.has(parsed.origin + match[1])) headers.set("Authorization", "Bearer " + tokens.get(parsed.origin + match[1]));
  const response = await nativeFetch(url, { ...init, headers, redirect: "error" });
  if (/^\/api\/builds\/?$/i.test(parsed.pathname) && response.status === 202) {
    const job = await response.clone().json();
    if (!/^[A-Fa-f0-9]{64}$/.test(job.accessToken || "")) throw Error("Missing task credential");
    tokens.set(parsed.origin + job.buildId, job.accessToken);
  }
  return response;
}
