import { captureWatchface } from "./watchfaceCapture";
import { readDesignReference, type DesignReference } from "./aiDesign";
import type { Preview } from "./Scene";
import RequestHistoryPanel from "./RequestHistoryPanel";
import { useEffect, useRef, useState } from "react";
import type { Project, Profile } from "./domain";
import {
  applyChat,
  chatFingerprint,
  chatPayload,
  type ChatMessage,
} from "./designChat";
import { requestDesignChat } from "./api";
type Entry = ChatMessage & { changes?: string[] };
export default function DesignChat({
  project,
  preview,
  profiles,
  selection,
  open,
  disabled,
  onClose,
  onModels,
  onApply,
  onUndo,
  canUndo,
}: {
  project: Project;
  preview: Preview;
  profiles: Profile[];
  selection: string[];
  open: boolean;
  disabled: boolean;
  onClose: () => void;
  onModels: () => void;
  onApply: (fingerprint: string, next: Project) => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const [profileId, setProfileId] = useState(profiles[0]?.id || "");
  const profile = profiles.find((p) => p.id === profileId) || profiles[0];
  const [input, setInput] = useState("");
  const [attachCurrent, setAttachCurrent] = useState(false);
  const [attachAod, setAttachAod] = useState(false);
  const [references, setReferences] = useState<DesignReference[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null),
    mounted = useRef(true),
    scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!open) controller.current?.abort();
  }, [open]);
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [entries, busy]);
  async function send() {
    if (busy || disabled || loadingReferences || !input.trim()) return;
    if (
      (attachCurrent || attachAod || references.length) &&
      !profile?.supportsImages
    ) {
      setError(
        "当前模型未确认支持图片理解；图片已保留，请配置支持视觉的模型或取消附图后发送文字。",
      );
      return;
    }
    if (!profile?.model) {
      setError("请先配置模型，再选择用于对话的模型。");
      return;
    }
    if (project.multiDevice?.scope === "device") {
      setError("请切换共享主设计；单设备布局调整可使用设备适配助手。");
      return;
    }
    const prompt = input.trim(),
      fingerprint = chatFingerprint(project),
      c = new AbortController();
    controller.current = c;
    const user: Entry = { role: "user", content: prompt };
    const history = [...entries, user];
    setEntries(history);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const images: { label: string; data: string }[] = [];
      if (attachCurrent) {
        const shot = await captureWatchface(project, preview, false);
        images.push({
          label:
            "当前亮屏盘面，固定数据：" +
            JSON.stringify({ ...shot, data: undefined }),
          data: shot.data,
        });
      }
      if (attachAod) {
        const shot = await captureWatchface(project, preview, true);
        images.push({
          label:
            "当前AOD盘面，固定数据：" +
            JSON.stringify({ ...shot, data: undefined }),
          data: shot.data,
        });
      }
      for (const r of references)
        images.push({
          label: "仅设计参考，不是可直接运行的素材：" + r.name,
          data: r.data,
        });
      if (c.signal.aborted) throw new DOMException("已取消", "AbortError");
      const raw = await requestDesignChat(
        profile,
        chatPayload(project, selection),
        history,
        c.signal,
        images,
      );
      if (c.signal.aborted || !mounted.current) return;
      const result = applyChat(project, raw);
      onApply(fingerprint, result.project);
      setEntries((items) => [
        ...items,
        {
          role: "assistant",
          content:
            result.message ||
            (result.changes.length ? "已调整设计。" : "请补充设计要求。"),
          changes: result.changes,
        },
      ]);
    } catch (e) {
      if (mounted.current) {
        setError(
          c.signal.aborted ? "已取消，本轮设计未修改。" : (e as Error).message,
        );
        setInput(prompt);
        setEntries((items) => items.slice(0, -1));
      }
    } finally {
      if (mounted.current) setBusy(false);
      controller.current = null;
    }
  }
  return (
    <section
      className="design-chat-panel"
      hidden={!open}
      aria-label="AI 设计助手"
    >
      <RequestHistoryPanel />
      <header>
        <div>
          <b>AI 设计助手</b>
          <small>用对话调整当前表盘</small>
        </div>
        <button onClick={onClose} aria-label="收起设计助手">
          收起
        </button>
      </header>
      <label>
        对话模型
        <select
          aria-label="设计助手模型"
          value={profile?.id || ""}
          onChange={(e) => setProfileId(e.target.value)}
          disabled={busy}
        >
          <option value="" disabled>
            请选择模型
          </option>
          {profiles.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name} · {p.model || "未选择模型"}
            </option>
          ))}
        </select>
      </label>
      {!profiles.length && <button onClick={onModels}>前往模型配置</button>}
      <p className="hint">
        发送当前设计结构和最近对话给所选模型；默认不发送图片。主动选择的截图和参考图会发送给模型，不发送工程源码。有效修改自动应用，可整轮撤销。满意后再生成工程。
      </p>
      <div
        className="design-chat-messages"
        role="log"
        aria-label="设计对话记录"
        ref={scroll}
      >
        {!entries.length && (
          <div className="design-chat-empty">
            <b>从一句设计要求开始</b>
            <p>例如：时间放大并下移，添加电量数据，改成冰蓝配色。</p>
            <p>复合控件保持一个整体；锁定图层请先手动解锁。</p>
          </div>
        )}
        {entries.map((e, i) => (
          <article className={e.role} key={i}>
            <small>{e.role === "user" ? "你" : "AI"}</small>
            <p>{e.content}</p>
            {!!e.changes?.length && (
              <ul>
                {e.changes.map((c, j) => (
                  <li key={j}>{c}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
        {busy && <p role="status">正在调整设计…</p>}
      </div>
      {error && (
        <p role="alert" className="design-chat-error">
          {error}
        </p>
      )}
      {project.multiDevice?.scope === "device" && (
        <p className="hint">请切换共享主设计后对话修改。</p>
      )}
      <fieldset
        disabled={busy || loadingReferences}
        className="chat-visual-options"
      >
        <legend>可选视觉输入</legend>
        <label>
          <input
            type="checkbox"
            checked={attachCurrent}
            onChange={(e) => setAttachCurrent(e.target.checked)}
          />
          发送当前亮屏截图
        </label>
        <label>
          <input
            type="checkbox"
            checked={attachAod}
            onChange={(e) => setAttachAod(e.target.checked)}
          />
          发送当前AOD截图
        </label>
        <label>
          添加设计参考（最多2张）
          <input
            aria-label="对话参考图片"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              if (references.length + files.length > 2) {
                setError("最多2张参考图片");
                return;
              }
              setLoadingReferences(true);
              try {
                const next = await Promise.all(files.map(readDesignReference));
                if (mounted.current)
                  setReferences((r) => [
                    ...r,
                    ...next.map((i) => ({ ...i, usage: "style" as const })),
                  ]);
              } catch (error) {
                setError((error as Error).message);
              } finally {
                setLoadingReferences(false);
              }
            }}
          />
        </label>
        {references.map((r) => (
          <div key={r.id}>
            {r.name}
            <button
              onClick={() =>
                setReferences((items) => items.filter((i) => i.id !== r.id))
              }
            >
              移除参考图
            </button>
          </div>
        ))}
        <small>
          勾选的截图与添加的参考图在发送时传给模型。当前模型：
          {profile?.supportsImages
            ? "已由用户确认图片能力"
            : "图片能力未知，保留图片但阻止视觉请求"}
          。
        </small>
      </fieldset>
      <label>
        设计要求
        <textarea
          aria-label="设计对话输入"
          value={input}
          maxLength={4000}
          disabled={busy}
          placeholder="描述想创建或调整的表盘…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
        />
      </label>
      <footer>
        <button disabled={busy || !canUndo || disabled} onClick={onUndo}>
          撤销上次编辑
        </button>
        <button
          disabled={busy || !entries.length}
          onClick={() => {
            setEntries([]);
            setError("");
          }}
        >
          清空对话
        </button>
        {busy ? (
          <button onClick={() => controller.current?.abort()}>取消请求</button>
        ) : (
          <button
            className="primary"
            disabled={
              disabled ||
              loadingReferences ||
              !input.trim() ||
              !profile?.model ||
              project.multiDevice?.scope === "device"
            }
            onClick={() => void send()}
          >
            发送并调整
          </button>
        )}
      </footer>
      <small className="hint">
        Ctrl / ⌘ + Enter
        发送；对话仅在本次编辑会话保留。调用可能产生模型服务费用。
      </small>
    </section>
  );
}
