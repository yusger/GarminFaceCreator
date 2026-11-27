import { chatFingerprint, applyChat, type ChatMessage } from "./designChat";
import { saveDesignSnapshot } from "./designHistory";
import type { Project } from "./domain";
export type VisualRound = {
  round: number;
  changes: string[];
  message: string;
  usage?: Record<string, number>;
  snapshotId?: string;
};
const visualKey = (p: Project) => chatFingerprint({ ...p, revision: 0 });
export async function optimizeVisual(options: {
  initial: Project;
  limit: number;
  signal: AbortSignal;
  getCurrent: () => Project;
  request: (
    p: Project,
    round: number,
    history: ChatMessage[],
  ) => Promise<{ raw: string; usage?: Record<string, number> }>;
  apply: (fingerprint: string, next: Project) => Project;
  expected: (fingerprint: string) => void;
  onRound: (round: VisualRound) => void;
}) {
  const o = options;
  if (!Number.isInteger(o.limit) || o.limit < 1 || o.limit > 5)
    throw Error("自动优化轮数须在1–5之间");
  let current = o.initial,
    expected = chatFingerprint(current),
    snapshots = current.designSnapshots,
    active = current.activeDesignSnapshot;
  const seen = new Set([visualKey(current)]),
    history: ChatMessage[] = [];
  const check = () => {
    o.signal.throwIfAborted();
    if (chatFingerprint(o.getCurrent()) !== expected)
      throw Error("设计已变化，自动优化已停止，未覆盖后续编辑。");
  };
  o.expected(expected);
  for (let i = 1; i <= o.limit; i++) {
    check();
    const reply = await o.request(current, i, history);
    check();
    const result = applyChat(current, reply.raw),
      key = visualKey(result.project);
    if (!result.changes.length || seen.has(key)) {
      o.onRound({
        round: i,
        changes: [],
        message: "没有新的有效修改，已停止。",
        usage: reply.usage,
      });
      return;
    }
    // First valid result also retains the session's starting state. Existing retention rules apply.
    if (i === 1) {
      const before = saveDesignSnapshot(current, "视觉优化 · 开始前");
      snapshots = before.designSnapshots;
      active = before.activeDesignSnapshot;
    }
    const next = saveDesignSnapshot(
      {
        ...result.project,
        designSnapshots: snapshots,
        activeDesignSnapshot: active,
      },
      `视觉优化 · 第${i}轮`,
    );
    check();
    expected = chatFingerprint(next);
    o.expected(expected);
    current = o.apply(chatFingerprint(current), next);
    expected = chatFingerprint(current);
    o.expected(expected);
    snapshots = current.designSnapshots;
    active = current.activeDesignSnapshot;
    seen.add(key);
    o.onRound({
      round: i,
      changes: result.changes,
      message: result.message,
      usage: reply.usage,
      snapshotId: active,
    });
    history.push({
      role: "assistant",
      content: result.message || result.changes.join("；"),
    });
  }
}
