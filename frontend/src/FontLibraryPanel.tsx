import { useEffect, useState } from "react";
import type { Layer, Project } from "./domain";
import { libraryFonts, fontPatch, missingGlyphs } from "./fontLibrary";
import { deviceFor } from "./devices";
export default function FontLibrary({
  layer,
  project,
  onApply,
  onClose,
}: {
  layer: Layer;
  project: Project;
  onApply: (patch: Partial<Layer>) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [sample, setSample] = useState(
    layer.text || "09:41 0123456789 -19.9°C -- 周五",
  );
  const [coverage, setCoverage] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    for (const f of libraryFonts)
      void (async () => {
        try {
          const r = await fetch("/fonts/" + f.file);
          if (!r.ok) throw Error("加载失败");
          const bytes = await r.arrayBuffer(),
            face = await new FontFace("Library_" + f.id, bytes).load();
          document.fonts.add(face);
          const missing = missingGlyphs(bytes, sample);
          if (active)
            setCoverage((c) => ({
              ...c,
              [f.id]: missing.length
                ? "缺字：" + missing.join(" ")
                : "样本文字已覆盖",
            }));
        } catch {
          if (active)
            setCoverage((c) => ({ ...c, [f.id]: "未能检查，请在设备核对" }));
        }
      })();
    return () => {
      active = false;
    };
  }, [sample]);
  const supported = ["text", "time", "date", "metric"].includes(layer.kind),
    pixels = Math.round((layer.size * deviceFor(project).pixels) / 454);
  return (
    <div className="font-library-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="字体素材库"
        className="font-library"
      >
        <header>
          <h2>字体素材库</h2>
          <button onClick={onClose}>关闭字体库</button>
        </header>
        <p>
          当前：{layer.name} · 设计字号 {layer.size} · 目标设备约 {pixels}
          px。系统字体实际尺寸由设备决定。
        </p>
        <label>
          搜索字体
          <input
            aria-label="搜索字体"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <label>
          检查文字
          <input
            aria-label="字体检查文字"
            maxLength={200}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
          />
        </label>
        <h3>资源库字体</h3>
        <p>
          使用实际字体预览并读取字符表检查样本；生成时仍按目标尺寸转换为
          FNT/PNG，许可证随源码导出。
        </p>
        <div className="font-cards">
          {libraryFonts
            .filter((f) =>
              (f.name + f.family + f.usage)
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((f) => (
              <article key={f.id}>
                <b>{f.name}</b>
                <small>
                  {f.family} · {f.usage} · {f.license}
                </small>
                <div
                  style={{ fontFamily: '"Library_' + f.id + '"', fontSize: 30 }}
                >
                  {sample}
                </div>
                <p role="status">{coverage[f.id] || "检查字符中…"}</p>
                <button
                  disabled={!supported}
                  onClick={() => {
                    onApply(fontPatch(f.id));
                    onClose();
                  }}
                >
                  应用{f.name}
                </button>
              </article>
            ))}
        </div>
        <h3>设备系统字体</h3>
        <p>
          网页使用替代字体；中文字形与尺寸需在目标设备验证，不提取或分发SDK字体。
        </p>
        <div className="font-system">
          {(
            [
              "auto",
              "xtiny",
              "systemXTiny",
              "tiny",
              "small",
              "medium",
              "large",
              "numberHot",
            ] as const
          ).map((id) => (
            <button
              key={id}
              onClick={() => {
                onApply({ garminFont: id, customFont: undefined });
                onClose();
              }}
            >
              {id}
            </button>
          ))}
        </div>
        {!supported && (
          <p>
            当前控件仅支持设备系统字体；资源库字体适用于时间、日期、数据和文字。
          </p>
        )}
      </section>
    </div>
  );
}
