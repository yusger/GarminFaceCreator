import { useState, useEffect } from "react";
import type { Layer, Project } from "./domain";
import { bitmapFontInfo } from "./bitmapFonts";
import { bitmapLayerBaseline, bitmapBaselinePatch } from "./bitmapFontLayout";
import { batchBitmapTypography } from "./bitmapTypography";
import { resolveControls } from "./projectControls";
function PixelInput({
  label,
  value,
  min,
  max,
  accept,
  onValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  accept: (n: number) => boolean;
  onValue: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const valid = (text: string) =>
    text.trim() !== "" &&
    Number.isInteger(Number(text)) &&
    Number(text) >= min &&
    Number(text) <= max &&
    accept(Number(text));
  return (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step="1"
        value={draft}
        onChange={(e) => {
          const text = e.currentTarget.value;
          setDraft(text);
          if (valid(text)) onValue(Number(text));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onBlur={() => {
          if (!valid(draft)) setDraft(String(value));
        }}
      />
    </label>
  );
}
export default function BitmapTypographyPanel({
  project: p,
  layer: l,
  selection,
  onChange,
  onApplyLayers,
}: {
  project: Project;
  layer: Layer;
  selection: string[];
  onChange: (patch: Partial<Layer>) => void;
  onApplyLayers: (layers: Layer[]) => void;
}) {
  const [target, setTarget] = useState(""),
    [error, setError] = useState("");
  const f = p.bitmapFonts?.find((f) => f.id === l.bitmapFontId);
  if (!f) return null;
  const info = bitmapFontInfo(f),
    targets = resolveControls(p).layers.filter(
      (n) => n.id !== l.id && n.bitmapFontId && !n.hidden,
    ),
    digits = Array.from({ length: 10 }, (_, i) => info.glyphs[48 + i]).every(
      (g) => g && g.xadvance > 0,
    );
  const apply = (action: () => void) => {
    try {
      action();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const number = (
    label: string,
    key: "bitmapTracking" | "bitmapBaselineShift" | "bitmapLineHeight",
    min: number,
    max: number,
  ) => (
    <PixelInput
      key={l.id + key}
      label={label}
      value={l[key] || 0}
      min={min}
      max={max}
      accept={(n) =>
        key !== "bitmapLineHeight" || n === 0 || n >= info.lineHeight
      }
      onValue={(n) => onChange({ [key]: n })}
    />
  );
  return (
    <fieldset className="readout-check" disabled={l.locked}>
      <legend>位图精细排版</legend>
      {number("字距（目标像素）", "bitmapTracking", 0, 12)}
      <label className="inline">
        <input
          aria-label="等宽数字"
          type="checkbox"
          disabled={!digits}
          checked={!!l.bitmapTabular}
          onChange={(e) => onChange({ bitmapTabular: e.target.checked })}
        />
        等宽数字
      </label>
      {!digits && (
        <p className="hint">字体需要完整的0–9字形才能设置等宽数字。</p>
      )}
      {number("基线偏移（目标像素）", "bitmapBaselineShift", -64, 64)}
      {number("行高（0使用字体原值）", "bitmapLineHeight", 0, 512)}
      <p>
        字体原始行高 {info.lineHeight}px · 基线 {bitmapLayerBaseline(p, l)}px
      </p>
      <label>
        对齐基线目标
        <select
          aria-label="对齐基线目标"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">选择另一位图文字</option>
          {targets.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!targets.some((n) => n.id === target)}
        onClick={() =>
          apply(() =>
            onChange(
              bitmapBaselinePatch(
                p,
                l,
                targets.find((n) => n.id === target)!,
              ),
            ),
          )
        }
      >
        对齐文字基线
      </button>
      <button
        type="button"
        disabled={selection.length < 2}
        onClick={() =>
          apply(() => onApplyLayers(batchBitmapTypography(p, selection, l.id)))
        }
      >
        应用字体与排版到选中文字
      </button>
      <p className="hint">
        字形保持固定像素。行高为0或不小于{info.lineHeight}
        px；批量操作保留颜色、数据绑定和位置。不同字体缺字或存在锁定对象时整批不应用。
      </p>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
