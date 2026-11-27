import { useEffect, useState } from "react";
import type { Layer, Project } from "./domain";
import { fontFamily } from "./customFonts";
import {
  readoutSamples,
  readoutWidthCheck,
  readoutCheckText,
} from "./readoutLayout";
import { bitmapFontInfo, bitmapGlyphMissing } from "./bitmapFonts";
import { bitmapTextLayout } from "./bitmapFontLayout";
import { generationDevice } from "./devices";
export default function ReadoutInspector({
  project,
  layer: l,
  onChange,
}: {
  project: Project;
  layer: Layer;
  onChange: (p: Partial<Layer>) => void;
}) {
  const [measurement, setMeasurement] = useState<{
    width: number;
    available: number;
    basis: string;
    missing?: string;
    inkOverflow?: boolean;
  }>();
  useEffect(() => {
    let live = true;
    const measure = () => {
      if (!live) return;
      const scale = generationDevice(project).screenWidth / 454,
        available = Math.trunc(l.w * scale),
        f = project.bitmapFonts?.find((f) => f.id === l.bitmapFontId);
      if (f) {
        const info = bitmapFontInfo(f),
          text = readoutCheckText(l),
          layout = bitmapTextLayout(
            info,
            text,
            0,
            0,
            available,
            Math.trunc(l.h * scale),
            l.textAlign,
            l,
          ),
          ink = layout.inkBounds;
        setMeasurement({
          width: layout.width,
          available,
          basis: "位图精确字宽",
          missing: bitmapGlyphMissing(info, text).join(" "),
          inkOverflow:
            !!ink &&
            (ink.x < 0 ||
              ink.right > available ||
              ink.y < 0 ||
              ink.bottom > Math.trunc(l.h * scale)),
        });
        return;
      }
      const dc = document.createElement("canvas").getContext("2d");
      if (!dc) return;
      dc.font = `${l.fontWeight || 400} ${l.size * scale}px ${fontFamily(l)}`;
      setMeasurement({
        width: readoutWidthCheck(l, (text) => dc.measureText(text).width).width,
        available,
        basis: "网页估算字宽",
      });
    };
    measure();
    void document.fonts.ready.then(measure);
    return () => {
      live = false;
    };
  }, [l, project.bitmapFonts, project.target, project.deviceSize]);
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
        {!measurement
          ? "字体宽度待测量"
          : `${measurement.basis} ${measurement.width.toFixed(1)} / 可用 ${measurement.available} 目标像素 · ${measurement.width > measurement.available ? "可能溢出，请加宽文字框" : "当前样本宽度可容纳"}`}
      </p>
      {measurement?.missing && (
        <p role="alert">样本缺字：{measurement.missing}</p>
      )}
      {measurement?.inkOverflow && (
        <p role="status">字形范围超出文字框，请检查字形外伸、行高和基线。</p>
      )}
      <p className="hint">
        样本仅用于排版检查，不改变真实读数。位图使用相同字形指标；其他字体为网页估算，须核对原生效果。
      </p>
    </fieldset>
  );
}
