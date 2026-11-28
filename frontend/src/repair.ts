import {binaryAssets} from "./assets";
import {
  parseFiles,
  type CodeFile,
  type Project,
  type Profile,
} from "./domain.ts";
import { activeVersion } from "./history";
export const REPAIR_MAX_ROUNDS = 2;
export const managedRepairPaths=["resources/settings/properties.xml","resources/settings/settings.xml","resources/settings/strings.xml","source/GfcMoon.mc","source/GfcBitmapText.mc","source/GfcWeather.mc","source/GfcIcons.mc","source/GfcWordTime.mc","source/GfcFrameReporter.mc","resources/drawables/gfc-icons.xml","resources/fonts/gfc-managed-fonts.xml","resources/fonts/gfc-library-icons.xml"];
const isManagedRepairPath=(path:string)=>managedRepairPaths.includes(path)||/^resources\/fonts\/GfcLibrary_/.test(path);
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
export function repairResourceReferences(p:Project,paths:string[]){
 const resources=[...new Set([...binaryAssets(p).map(a=>a.path),...p.files.filter(f=>/^resources\/[\w/-]+\.(fnt|svg)$/.test(f.path)).map(f=>f.path)])];
 return paths.filter(path=>path.startsWith("resources/")&&path.endsWith(".xml")).flatMap(file=>resources.map(projectPath=>({file,projectPath,filename:"../".repeat(file.split("/").length-1)+projectPath})));
}
export function repairPayload(
  p: Project,
  paths: string[],
  logs: string,
  profile: Profile,
) {
  if(paths.some(isManagedRepairPath))throw Error("固定平台文件不允许AI修复修改，请调整画布后重新生成。");
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
    allowedResourceReferences:repairResourceReferences(p,paths),
    preferredOutput:"Prefer {edits:[{path,find,replace}]} for small corrections. Each find must match exactly once in the selected original text. At most20 edits, no fuzzy matching. Complete changed files remain accepted as {files:[{path,content}]}, but do not mix formats.",
    constraints:
      "Only replace selected existing files. Do not add or delete files or alter manifest, jungle, identity, device, permissions or build commands. Resource filenames may only be corrected to an explicit filename in allowedResourceReferences for that selected file; do not invent paths. No networking, shell, secrets or external resources. Preserve unrelated behavior and AOD lifecycle.",
  };
}
export function mergeRepair(
  p: Project,
  paths: string[],
  raw: string,
): CodeFile[] {
  if(paths.some(isManagedRepairPath))throw Error("固定平台文件不允许AI修复修改");
  const result = JSON.parse(raw);
  if(result.edits!==undefined){
   if(result.files!==undefined||!Array.isArray(result.edits)||!result.edits.length||result.edits.length>20)throw Error("补丁须为1–20项edits，不能与files混用");
   const changed=new Map<string,string>();
   for(const edit of result.edits){
    if(!edit||Object.keys(edit).some(k=>!["path","find","replace"].includes(k))||!paths.includes(edit.path)||typeof edit.find!=="string"||!edit.find.length||edit.find.length>12000||typeof edit.replace!=="string"||edit.replace.length>24000)throw Error("精确文本补丁格式或范围无效");
    const before=changed.get(edit.path)??p.files.find(f=>f.path===edit.path)?.content;
    if(before===undefined||before.indexOf(edit.find)<0||before.indexOf(edit.find)!==before.lastIndexOf(edit.find))throw Error("精确文本补丁必须唯一命中原文，原代码未修改");
    changed.set(edit.path,before.replace(edit.find,()=>edit.replace));
   }
   result.files=[...changed].map(([path,content])=>({path,content}));
  }
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
    if(f.path.startsWith("resources/")&&f.path.endsWith(".xml")){
      const filenames=(text:string)=>[...text.matchAll(/\bfilename\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]);
      const before=new Set(filenames(p.files.find(x=>x.path===f.path)!.content));
      const allowed=new Set(repairResourceReferences(p,paths).filter(r=>r.file===f.path).map(r=>r.filename));
      if(filenames(f.content).some(name=>!before.has(name)&&!allowed.has(name)))throw Error("修复引用了未授权素材路径");
    }
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
