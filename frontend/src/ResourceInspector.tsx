import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "./domain";
import {
  inspectLocalImage,
  resourceBytes,
  resourceInventory,
  type ImageInspection,
} from "./resourceInventory";
export default function ResourceInspector({
  project,
  onLocate,
}: {
  project: Project;
  onLocate: (id: string) => void;
}) {
  const cache = useRef(new Map<string, ImageInspection>());
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => resourceInventory(project), [project]);
  const [inspections, setInspections] = useState<Map<string, ImageInspection>>(
    new Map(),
  );
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const next = new Map<string, ImageInspection>();
      for (const entry of entries)
        if (entry.data) {
          const detail =
            cache.current.get(entry.data) ||
            (await inspectLocalImage(entry.data));
          cache.current.set(entry.data, detail);
          if (cancelled) return;
          next.set(entry.id, detail);
        }
      if (!cancelled) setInspections(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [entries, open]);
  return (
    <details
      data-resource-inspector
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>项目资源检查 · {entries.length} 项</summary>
      <p className="hint">
        仅在浏览器本地检查，不上传素材。相同图片合并统计；引用包含当前设计、历史与设备变体，历史素材仍保留。
      </p>
      <p className="hint">
        解码估算按原图宽×高×4计算，表示RGBA像素体积，不能作为佳明运行内存、峰值或设备限额。字体图集与目标缩放后的资源须在生成后检查。
      </p>
      {!entries.length && <p>当前项目没有嵌入图片或资源字体。</p>}
      {entries.map((entry) => {
        const detail = inspections.get(entry.id);
        const layerIds = [
          ...new Set(
            entry.references.flatMap((r) => (r.layerId ? [r.layerId] : [])),
          ),
        ];
        return (
          <article key={entry.id} className="resource-inspection-row">
            <b>{entry.name}</b>
            <p>
              {entry.kind === "font"
                ? "资源字体 · 字节与图集待生成检查"
                : `编码 ${resourceBytes(entry.encodedBytes)} · ${detail?.width ? `${detail.width}×${detail.height}px` : "像素待检查"}`}
            </p>
            {detail && (
              <p>
                透明像素：
                {detail.alpha === undefined
                  ? "未知"
                  : detail.alpha
                    ? "有"
                    : "无"}{" "}
                · RGBA估算 {resourceBytes(detail.rgbaBytes)}
              </p>
            )}
            {detail?.error && <p role="status">{detail.error}</p>}
            <p>
              引用 {entry.references.length} 处 · 当前{" "}
              {entry.references.filter((r) => r.scope === "current").length} ·
              历史{" "}
              {entry.references.filter((r) => r.scope === "history").length} ·
              变体{" "}
              {entry.references.filter((r) => r.scope === "variant").length}
            </p>
            {layerIds.map((id) => (
              <button key={id} onClick={() => onLocate(id)}>
                定位 {project.layers.find((l) => l.id === id)?.name || "控件"}
              </button>
            ))}
            <details>
              <summary>引用位置</summary>
              {entry.references.map((r, i) => (
                <p key={i}>
                  {r.name} · {r.path}
                </p>
              ))}
            </details>
          </article>
        );
      })}
    </details>
  );
}
