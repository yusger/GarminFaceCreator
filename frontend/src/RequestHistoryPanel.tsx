import { useEffect, useState } from "react";
import { readRequestHistory, clearRequestHistory } from "./aiRequestHistory";
import { download } from "./storage";
export default function RequestHistoryPanel() {
  const [items, setItems] = useState(readRequestHistory);
  useEffect(() => {
    const refresh = () => setItems(readRequestHistory());
    window.addEventListener("gfc-ai-requests", refresh);
    return () => window.removeEventListener("gfc-ai-requests", refresh);
  }, []);
  return (
    <details className="request-history">
      <summary>本地请求记录（{items.length}）</summary>
      <p className="hint">
        只保留最近24条、约512KiB以内的脱敏请求。图片不保存；收到响应不表示设计已应用。用量未返回则未知，费用以服务商账单为准。
      </p>
      <button
        disabled={!items.length}
        onClick={() => download("gfc-ai-requests.json", items)}
      >
        导出请求记录
      </button>
      <button disabled={!items.length} onClick={clearRequestHistory}>
        清空请求记录
      </button>
      {items
        .slice()
        .reverse()
        .map((r) => (
          <p key={r.id}>
            {r.kind} · {r.model} · {r.status}
            <br />
            <small>
              {r.promptVersion} / {r.capabilityVersion} ·{" "}
              {new Date(r.at).toLocaleString()} ·{" "}
              {r.usage ? JSON.stringify(r.usage) : "用量未知"}
            </small>
          </p>
        ))}
    </details>
  );
}
