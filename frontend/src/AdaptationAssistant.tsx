import { useState, useRef, useEffect } from "react";
import type { Project, Profile } from "./domain";
import Scene, { type Preview } from "./Scene";
import { requestAdaptation } from "./api";
import {
  adaptationPayload,
  adaptationFingerprint,
  parseAdaptation,
  applyAdaptation,
  type AdaptationChange,
} from "./adaptation";
import { projectForDevice, deviceKey } from "./multiDevice";
export default function AdaptationAssistant({
  project: p,
  profile,
  preview,
  onClose,
  onApply,
}: {
  project: Project;
  profile?: Profile;
  preview: Preview;
  onClose: () => void;
  onApply: (fingerprint: string, changes: AdaptationChange[]) => void;
}) {
  const [instruction, setInstruction] = useState(
    "保留当前设计风格，改善该设备上的字号、间距和圆屏边缘裁切，只做必要调整。",
  );
  const [result, setResult] = useState<{
      fingerprint: string;
      changes: AdaptationChange[];
      project: Project;
    } | null>(null),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const [raw, setRaw] = useState("");
  const payload = profile ? adaptationPayload(p, profile, instruction) : null;
  async function run() {
    if (!profile?.model || !payload) {
      setError("请先在模型配置中添加模型，并在 AI 面板选择本次模型。");
      return;
    }
    if (
      !confirm(
        `将下方设计文本发送到 ${profile.name} / ${profile.model}，可能产生服务商费用。图片像素、源码、历史和其他设备配置不会发送。继续？`,
      )
    )
      return;
    const c = new AbortController();
    controller.current = c;
    setSending(true);
    setError("");
    setResult(null);
    setRaw("");
    try {
      const text = await requestAdaptation(profile, payload, c.signal);
      setRaw(text);
      const changes = parseAdaptation(p, text);
      setResult({
        fingerprint: adaptationFingerprint(p),
        changes,
        project: applyAdaptation(p, changes),
      });
    } catch (e) {
      setError(
        c.signal.aborted ? "请求已取消，设计未修改" : (e as Error).message,
      );
    } finally {
      setSending(false);
      controller.current = null;
    }
  }
  return (
    <div className="loading">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="AI 辅助设备适配"
        className="adaptation-assistant"
      >
        <header>
          <h2>AI 辅助设备适配</h2>
          <button onClick={onClose}>关闭适配助手</button>
        </header>
        <p>
          当前模型：{profile?.name || "未配置"} / {profile?.model || "未选择"}
          。建议只应用到当前设备，主设计保持共享。
        </p>
        <label>
          适配要求
          <textarea
            aria-label="适配要求"
            disabled={sending}
            maxLength={4000}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </label>
        <details>
          <summary>查看发送内容</summary>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </details>
        <button disabled={sending} onClick={run}>
          请求适配建议
        </button>
        {sending && (
          <button onClick={() => controller.current?.abort()}>
            取消适配请求
          </button>
        )}
        {error && <p role="alert">{error}</p>}
        {result && (
          <>
            <div className="adaptation-comparison">
              <div>
                <h3>调整前</h3>
                <Scene
                  project={projectForDevice(p, deviceKey(p))}
                  preview={preview}
                  exact
                />
              </div>
              <div>
                <h3>建议效果</h3>
                <Scene project={result.project} preview={preview} exact />
              </div>
            </div>
            <details open>
              <summary>图层调整明细</summary>
              <pre>{JSON.stringify(result.changes, null, 2)}</pre>
            </details>
            <button onClick={() => onApply(result.fingerprint, result.changes)}>
              应用到当前设备
            </button>
            <button
              onClick={() => {
                setResult(null);
                setRaw("");
              }}
            >
              放弃建议
            </button>
          </>
        )}
        {raw && !result && (
          <details>
            <summary>模型原始返回</summary>
            <pre>{raw}</pre>
          </details>
        )}
      </section>
    </div>
  );
}
