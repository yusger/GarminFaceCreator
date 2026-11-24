import { useEffect, useState } from "react";
import type { Layer } from "./domain";
export default function Palette({
  layers,
  selection,
  onChange,
}: {
  layers: Layer[];
  selection: string[];
  onChange: (layers: Layer[]) => void;
}) {
  const colors = [
    ...new Set(layers.filter((l) => l.kind !== "image").map((l) => l.color)),
  ];
  const [from, setFrom] = useState(colors[0] || "#ffffff"),
    [to, setTo] = useState("#45d6be"),
    [scope, setScope] = useState("selection"),
    [status, setStatus] = useState("");
  useEffect(() => {
    if (!colors.includes(from)) setFrom(colors[0] || "#ffffff");
  }, [layers, from]);
  return (
    <details className="palette-panel">
      <summary>批量基础配色</summary>
      <label>
        作用范围
        <select
          aria-label="配色作用范围"
          value={selection.length ? scope : "all"}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="selection" disabled={!selection.length}>
            选中图层
          </option>
          <option value="all">全部可编辑图层</option>
        </select>
      </label>
      <label>
        原基础色
        <select
          aria-label="原基础色"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        >
          {colors.map((color) => (
            <option key={color} value={color}>
              {color.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <label>
        目标基础色
        <input
          aria-label="目标基础色"
          type="color"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <button
        onClick={() => {
          let count = 0;
          const next = layers.map((l) =>
            l.kind !== "image" &&
            !l.locked &&
            (!selection.length ||
              scope === "all" ||
              selection.includes(l.id)) &&
            l.color.toLowerCase() === from.toLowerCase() &&
            l.color.toLowerCase() !== to.toLowerCase()
              ? (count++, { ...l, color: to })
              : l,
          );
          if (count) onChange(next);
          setStatus(
            count ? `已替换 ${count} 个图层基础色` : "没有匹配的可编辑图层",
          );
        }}
      >
        应用配色
      </button>
      <p className="hint">
        基础色替换，锁定图层和图片受保护；阈值与息屏使用各自配置。
      </p>
      {status && <p role="status">{status}</p>}
    </details>
  );
}
