const tokens = new Map<string, string>();
function idOf(path: string) {
  const url = new URL(path, location.origin);
  if (url.origin !== location.origin) throw Error("拒绝访问外部编译地址");
  return /^\/api\/builds\/([a-f0-9]{32})(?:\/|$)/.exec(url.pathname)?.[1];
}
export async function buildFetch(path: string, init: RequestInit = {}) {
  const id = idOf(path);
  const headers = new Headers(init.headers);
  if (id) {
    const token = tokens.get(id) || sessionStorage.getItem("gfc-build-token-" + id);
    if (!token) throw Error("缺少任务访问凭证，请重新编译；旧任务不再允许匿名访问");
    headers.set("Authorization", "Bearer " + token);
  }
  const response = await fetch(path, { ...init, headers, cache: "no-store", redirect: "error" });
  if (!id && response.status === 202) {
    const job = await response.clone().json();
    if (typeof job.accessToken !== "string" || !/^[A-Fa-f0-9]{64}$/.test(job.accessToken)) throw Error("编译服务未返回任务访问凭证");
    tokens.set(job.buildId, job.accessToken);
    try { sessionStorage.setItem("gfc-build-token-" + job.buildId, job.accessToken); } catch { /* current page still has its in-memory credential */ }
  }
  return response;
}
export async function downloadBuild(path: string, name: string) {
  const response = await buildFetch(path);
  if (!response.ok) throw Error(response.status === 404 ? "任务已过期或访问凭证失效，请重新编译" : "下载失败，请稍后重试");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
