import { useState, useEffect, useRef } from "react";
import type { Project, Profile, CodeFile, CodeProvenance } from "./domain";
import { repairCode } from "./api";
import {
  repairPayload,
  repairDiff,
  repairRoot,
  repairBudgetKey,
  REPAIR_MAX_ROUNDS,
} from "./repair";
export default function RepairPanel({
  project,
  profile,
  logs,
  busy,
  onBegin,
  onEnd,
  onApply,
}: {
  project: Project;
  profile?: Profile;
  logs: string;
  busy: boolean;
  onBegin: () => boolean;
  onEnd: () => void;
  onApply: (
    base: Project,
    files: CodeFile[],
    provenance: CodeProvenance,
  ) => void;
}) {
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => () => inFlight.current?.abort(), []);
  const [paths, setPaths] = useState<string[]>(() =>
    project.files
      .filter(
        (f) => f.path.startsWith("source/") && f.path !== "source/GfcIcons.mc",
      )
      .slice(0, 1)
      .map((f) => f.path),
  );
  const [diagnostics, setDiagnostics] = useState("");
  const [result, setResult] = useState<{
    base: Project;
    files: CodeFile[];
  } | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);
  const [rounds, setRounds] = useState(() => {
    try {
      return Number(localStorage.getItem(repairBudgetKey(project))) || 0;
    } catch {
      return REPAIR_MAX_ROUNDS;
    }
  });
  let payload = "";
  try {
    if (profile)
      payload = JSON.stringify(
        repairPayload(project, paths, diagnostics, profile),
        null,
        2,
      );
  } catch (e) {
    payload = (e as Error).message;
  }
  async function run() {
    if (!profile?.model) {
      setError("请先配置模型并在 AI 面板选择本次模型。");
      return;
    }
    try {
      repairPayload(project, paths, diagnostics, profile);
      const used = Number(localStorage.getItem(repairBudgetKey(project))) || 0;
      if (used >= REPAIR_MAX_ROUNDS)
        throw Error(
          "本轮工程已达到最多两次修复请求。请自行检查或重新完整生成；不会自动重试。",
        );
      if (
        !confirm(
          `将发送下方预览中的脱敏文本到 ${profile.name} / ${profile.model}？最多输出 ${Math.min(profile.tokens, 8192)} Token，可能产生服务商费用；本次计入两轮限制。`,
        )
      )
        return;
      if (!onBegin()) return;
      try {
        localStorage.setItem(repairBudgetKey(project), String(used + 1));
        setRounds(used + 1);
        setSending(true);
        setError("");
        setResult(null);
        const abort = new AbortController();
        setController(abort);
        inFlight.current = abort;
        const files = await repairCode(
          profile,
          project,
          paths,
          diagnostics,
          abort.signal,
        );
        setResult({ base: structuredClone(project), files });
      } finally {
        setSending(false);
        setController(null);
        inFlight.current = null;
        onEnd();
      }
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "已取消；原代码未变，请求仍计入轮数。"
          : (e as Error).message,
      );
    }
  }
  return (
    <div className="repair-panel">
      <p>
        手动修复 · {profile?.name || "未配置模型"} /{" "}
        {profile?.model || "未选择模型"} · 本轮请求 {rounds}
        /2。只发送选中文件和下方日志，不发送图片、设计历史或浏览器配置；不会自动编译、重试或应用。
      </p>
      <p>
        每次至多 5 个文件 / 120000 字符，日志至多 16000 字符，输出至多 8192
        Token。脱敏是辅助，请逐项检查发送预览。关闭修复面板或切换项目前先等待或取消请求。
      </p>
      <div className="repair-columns">
        <fieldset disabled={busy}>
          <legend>允许修改的文件</legend>
          {project.files
            .filter(
              (f) =>
                /^source\/|^resources\//.test(f.path) &&
                ![
                  "source/GfcIcons.mc",
                  "resources/drawables/gfc-icons.xml",
                ].includes(f.path),
            )
            .map((f) => (
              <label key={f.path}>
                <input
                  type="checkbox"
                  aria-label={"允许修复 " + f.path}
                  checked={paths.includes(f.path)}
                  onChange={(e) => {
                    setPaths(
                      e.target.checked
                        ? [...paths, f.path]
                        : paths.filter((p) => p !== f.path),
                    );
                    setResult(null);
                  }}
                />
                {f.path}
              </label>
            ))}
        </fieldset>
        <label>
          待发送的相关日志
          <textarea
            aria-label="修复相关日志"
            disabled={busy}
            maxLength={16000}
            value={diagnostics}
            onChange={(e) => {
              setDiagnostics(e.target.value);
              setResult(null);
            }}
          />
          <button
            disabled={busy}
            onClick={() => {
              setDiagnostics(logs.slice(-16000));
              setResult(null);
            }}
          >
            选取当前日志（待检查）
          </button>
        </label>
      </div>
      <details>
        <summary>检查完整发送预览（已脱敏）</summary>
        <pre>{payload}</pre>
      </details>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy || rounds >= REPAIR_MAX_ROUNDS || !profile}
        onClick={run}
      >
        发送一次修复请求
      </button>
      {sending && <button onClick={() => controller?.abort()}>取消修复</button>}
      {result && (
        <>
          <h4>逐文件差异（原代码尚未改变）</h4>
          {result.files
            .filter(
              (f) =>
                result.base.files.find((b) => b.path === f.path)?.content !==
                f.content,
            )
            .map((f) => {
              const diff = repairDiff(
                result.base.files.find((b) => b.path === f.path)!.content,
                f.content,
              );
              return (
                <details key={f.path} open>
                  <summary>
                    {f.path} · 从第 {diff.line} 行变化
                  </summary>
                  <div className="repair-columns">
                    <pre aria-label={"修复前 " + f.path}>{diff.removed}</pre>
                    <pre aria-label={"修复后 " + f.path}>{diff.added}</pre>
                  </div>
                </details>
              );
            })}
          <button
            disabled={busy}
            onClick={() => {
              if (
                !confirm("应用所审阅修复？将保留当前代码快照；编译需手动发起。")
              )
                return;
              onApply(result.base, result.files, {
                ...(result.base.codeProvenance || { primary: "unknown" }),
                repairRootId: repairRoot(result.base),
                patches: [
                  ...(result.base.codeProvenance?.patches || []),
                  { source: "ai", at: Date.now() },
                ],
              });
              setResult(null);
            }}
          >
            应用所审阅修复
          </button>
          <button onClick={() => setResult(null)}>丢弃修复结果</button>
        </>
      )}
    </div>
  );
}
