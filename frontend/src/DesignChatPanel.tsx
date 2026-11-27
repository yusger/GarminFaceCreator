import { optimizeVisual, type VisualRound } from "./visualOptimization";
import { restoreDesignSnapshot } from "./designHistory";
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
  onApply: (fingerprint: string, next: Project) => Project;
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
  const [roundLimit, setRoundLimit] = useState(3),
    [rounds, setRounds] = useState<VisualRound[]>([]);
  const latest = useRef(project),
    applyLatest = useRef(onApply),
    expectedVisual = useRef<string | null>(null);
  latest.current = project;
  applyLatest.current = onApply;
  useEffect(() => {
    if (
      expectedVisual.current &&
      (disabled || chatFingerprint(project) !== expectedVisual.current)
    )
      controller.current?.abort(new Error("设计已变化，自动优化已停止。"));
  }, [project, disabled]);
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
  async function autoOptimize() {
    if (busy || disabled || loadingReferences || !input.trim()) return;
    if (!profile?.supportsImages || !(attachCurrent || attachAod)) {
      setError(
        "自动优化需要已确认图片能力的模型，并主动勾选至少一种盘面截图。",
      );
      return;
    }
    if (project.multiDevice?.scope === "device") {
      setError("请切换共享主设计后优化。");
      return;
    }
    const c = new AbortController(),
      prompt = input.trim(),
      selectedProfile = profile,
      refs = [...references];
    let frozen = structuredClone(preview), fixedInitialized=false;
    controller.current = c;
    setBusy(true);
    setError("");
    setRounds([]);
    try {
      await optimizeVisual({
        initial: project,
        limit: roundLimit,
        signal: c.signal,
        getCurrent: () => latest.current,
        apply: (fp, next) => {
          const p = applyLatest.current(fp, next);
          latest.current = p;
          return p;
        },
        expected: (fp) => {
          expectedVisual.current = fp;
        },
        onRound: (r) => {
          if (mounted.current) setRounds((items) => [...items, r]);
        },
        request: async (current, round, history) => {
          const images: { label: string; data: string }[] = [];
          for (const aod of [false, true]) {
            if (aod ? !attachAod : !attachCurrent) continue;
            const shot = await captureWatchface(current, frozen, aod);
            frozen = shot.preview;
            c.signal.throwIfAborted();
            if (chatFingerprint(latest.current) !== chatFingerprint(current))
              throw Error("截图期间设计已变化，自动优化已停止。");
            images.push({
              label:
                (aod ? "当前AOD" : "当前亮屏") +
                "，固定数据：" +
                JSON.stringify({ ...shot, data: undefined }),
              data: shot.data,
            });
          }
          for (const r of refs)
            images.push({ label: "仅设计参考：" + r.name, data: r.data });
          let usage: Record<string, number> | undefined;
          const raw = await requestDesignChat(
            selectedProfile,
            chatPayload(current, selection),
            [
              { role: "user", content: prompt },
              ...history,
              {
                role: "user",
                content: `这是用户主动启动的视觉优化第${round}/${roundLimit}轮。依据最新盘面与结构改进设计；已经满足要求时返回空operations。只输出允许的结构补丁。`,
              },
            ],
            c.signal,
            images,
            (u) => {
              usage = u;
            },
          );
          return { raw, usage };
        },
      });
    } catch (e) {
      if (mounted.current)
        setError(
          c.signal.aborted
            ? c.signal.reason instanceof Error &&
              c.signal.reason.name !== "AbortError"
              ? c.signal.reason.message
              : "已停止自动优化，保留已完成轮次；已发出的请求可能产生费用。"
            : (e as Error).message,
        );
    } finally {
      expectedVisual.current = null;
      controller.current = null;
      if (mounted.current) setBusy(false);
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
      <details className="visual-rounds">
        <summary>视觉自动优化（{rounds.length}轮记录）</summary>
        <label>
          最多轮数
          <select
            aria-label="视觉优化轮数"
            disabled={busy}
            value={roundLimit}
            onChange={(e) => setRoundLimit(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option value={n} key={n}>
                {n}轮
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => void autoOptimize()}
          disabled={
            busy ||
            disabled ||
            loadingReferences ||
            !input.trim() ||
            !profile?.model
          }
        >
          开始自动优化
        </button>
        <p className="hint">
          会发送已选择的截图与参考图，逐轮调用模型；费用以服务商账单为准，取消也可能收费。每轮检查点可在历史恢复。网页截图不代表设备验证。
        </p>
        {rounds.map((r) => (
          <article key={r.round}>
            <b>第{r.round}轮</b>
            <p>{r.message}</p>
            <ul>
              {r.changes.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
            <small>
              {r.usage && Object.keys(r.usage).length
                ? "实际用量：" + JSON.stringify(r.usage)
                : "服务商未返回用量"}
            </small>
            {r.snapshotId &&
              project.designSnapshots?.some((s) => s.id === r.snapshotId) && (
                <button
                  disabled={busy || disabled}
                  onClick={() => {
                    try {
                      const p = latest.current;
                      onApply(
                        chatFingerprint(p),
                        restoreDesignSnapshot(p, r.snapshotId!),
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  恢复第{r.round}轮检查点
                </button>
              )}
          </article>
        ))}
      </details>
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
