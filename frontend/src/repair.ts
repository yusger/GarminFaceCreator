import {
  parseFiles,
  type CodeFile,
  type Project,
  type Profile,
} from "./domain.ts";
import { activeVersion } from "./history";
export const REPAIR_MAX_ROUNDS = 2;
export const repairRoot = (p: Project) =>
  p.codeProvenance?.repairRootId ||
  activeVersion(p) ||
  `legacy-${p.id}-${p.codeRevision}`;
export const repairBudgetKey = (p: Project) =>
  "gfc-repair-rounds:" + p.id + ":" + repairRoot(p);
export function redactRepair(text: string, secrets: string[] = []) {
  let result = text;
  for (const secret of secrets)
    if (secret.length >= 6) result = result.replaceAll(secret, "[REDACTED]");
  return result
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]")
    .replace(/(Bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(
      /((?:api[_-]?key|password|passwd|secret|token)\s*[=:]\s*["']?)[^\s"',;}]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
      "[PRIVATE_HOST]",
    )
    .replace(/[A-Za-z]:[\\/][^\s"'<>]+/g, "[LOCAL_PATH]")
    .replace(
      /\/(?:home|Users|data|tmp|root|workspace)\/[^\s"'<>]+/g,
      "[LOCAL_PATH]",
    );
}
export function repairPayload(
  p: Project,
  paths: string[],
  logs: string,
  profile: Profile,
) {
  if (
    paths.some((path) =>
      ["source/GfcIcons.mc", "resources/drawables/gfc-icons.xml"].includes(
        path,
      ),
    )
  )
    throw Error("固定图标映射文件不允许 AI 修复修改，请调整画布后重新生成。");
  const files = p.files.filter((f) => paths.includes(f.path));
  if (
    !files.length ||
    files.length > 5 ||
    new Set(paths).size !== paths.length ||
    files.length !== paths.length ||
    files.some(
      (f) =>
        !/^source\/[\w/-]+\.mc$|^resources\/[\w/-]+\.(xml|svg|fnt)$/.test(
          f.path,
        ),
    )
  )
    throw Error(
      "请选择 1–5 个已有源码/资源文本文件；manifest 和 jungle 不允许修复修改。",
    );
  if (
    files.reduce((n, f) => n + f.content.length, 0) > 120000 ||
    logs.length > 16000
  )
    throw Error("相关文件最多 120000 字符，日志最多 16000 字符；请缩小范围。");
  return {
    target: p.target || "venu445mm",
    files: files.map((f) => ({
      ...f,
      content: redactRepair(f.content, [profile.key]),
    })),
    logs: redactRepair(logs, [profile.key]),
    constraints:
      "Only replace selected existing files. Do not add or delete files or alter manifest, jungle, identity, device, permissions, resource paths or build commands. No networking, shell, secrets or external resources. Preserve unrelated behavior and AOD lifecycle.",
  };
}
export function mergeRepair(
  p: Project,
  paths: string[],
  raw: string,
): CodeFile[] {
  const result = JSON.parse(raw);
  if (!Array.isArray(result.files) || !result.files.length)
    throw Error("修复必须返回非空 files 数组");
  const seen = new Set<string>();
  for (const f of result.files) {
    if (
      typeof f.path !== "string" ||
      !paths.includes(f.path) ||
      seen.has(f.path.toLowerCase()) ||
      typeof f.content !== "string" ||
      !f.content.trim()
    )
      throw Error("修复返回了未授权、重复或无效文件");
    seen.add(f.path.toLowerCase());
  }
  const merged = p.files.map(
    (f) => result.files.find((r: CodeFile) => r.path === f.path) || f,
  );
  parseFiles(JSON.stringify({ files: merged }));
  if (JSON.stringify(merged) === JSON.stringify(p.files))
    throw Error("模型没有返回代码变化");
  return merged;
}
export function repairDiff(before: string, after: string) {
  const a = before.split("\n"),
    b = after.split("\n");
  let start = 0,
    end = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  while (
    end < a.length - start &&
    end < b.length - start &&
    a[a.length - end - 1] === b[b.length - end - 1]
  )
    end++;
  return {
    line: start + 1,
    removed: a.slice(start, a.length - end).join("\n"),
    added: b.slice(start, b.length - end).join("\n"),
  };
}
