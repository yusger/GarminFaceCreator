import { useEffect, useState } from "react";
import type { Layer } from "./domain";
import { fontFamily } from "./customFonts";
import { readoutSamples, readoutWidthCheck } from "./readoutLayout";
export default function ReadoutInspector({
  layer: l,
  onChange,
}: {
  layer: Layer;
  onChange: (p: Partial<Layer>) => void;
}) {
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    let live = true;
    const measure = () => {
      if (!live) return;
      const dc = document.createElement("canvas").getContext("2d");
      if (!dc) return;
      dc.font = `${l.fontWeight || 400} ${l.size}px ${fontFamily(l)}`;
      setWidth(
        readoutWidthCheck(l, (text) => dc.measureText(text).width).width,
      );
    };
    measure();
    void document.fonts.ready.then(measure);
    return () => {
      live = false;
    };
  }, [l]);
  return (
    <fieldset className="readout-check">
      <legend>最大读数排版检查</legend>
      <label>
        最大读数样本
        <input
          aria-label="最大读数样本"
          maxLength={48}
          value={l.readoutSample || ""}
          placeholder={readoutSamples[l.source] || "99999"}
          onChange={(e) => onChange({ readoutSample: e.target.value })}
        />
      </label>
      <p role="status">
        {width === undefined
          ? "字体宽度待测量"
          : `网页估算宽度 ${width.toFixed(1)} / 可用 ${l.w.toFixed(1)} · ${width > l.w ? "可能溢出，请加宽或缩小字号" : "当前样本可容纳"}`}
      </p>
      <p className="hint">
        样本仅用于宽度检查，不改变预览数据或原生读数；字体及AOD请在目标设备核对。
      </p>
    </fieldset>
  );
}
