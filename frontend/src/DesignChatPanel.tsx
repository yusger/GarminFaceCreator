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
    if (busy || disabled || !input.trim()) return;
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
      const raw = await requestDesignChat(
        profile,
        chatPayload(project, selection),
        history,
        c.signal,
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
        发送当前设计结构和最近对话给所选模型；不发送图片像素或工程源码。有效修改自动应用，可整轮撤销。满意后再生成工程。
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
