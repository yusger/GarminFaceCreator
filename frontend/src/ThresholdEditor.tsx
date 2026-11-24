import { useEffect, useState } from "react";
import type { Layer, ThresholdRange } from "./domain";
import { defaultThresholds, validateThresholds } from "./thresholds";
export default function ThresholdEditor({
  layer,
  onApply,
}: {
  layer: Layer;
  onApply: (v: Partial<Layer>) => void;
}) {
  const toDraft = (rules: ThresholdRange[]) =>
    rules.map((r) => ({
      min: r.min === undefined ? "" : String(r.min),
      max: r.max === undefined ? "" : String(r.max),
      color: r.color,
    }));
  const [draft, setDraft] = useState(() =>
    toDraft(
      layer.thresholdRules ?? defaultThresholds(layer.source, layer.color),
    ),
  );
  const [fallback, setFallback] = useState(
    layer.thresholdFallback || layer.color,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(
      toDraft(
        layer.thresholdRules ?? defaultThresholds(layer.source, layer.color),
      ),
    );
    setFallback(layer.thresholdFallback || layer.color);
    setError("");
  }, [layer.id, layer.source, layer.thresholdRules, layer.thresholdFallback]);
  return (
    <div className="threshold-editor">
      <p className="hint">
        区间下界包含、上界不包含；留空表示无界。未命中或数据无效使用兜底色。编辑后点击应用。
      </p>
      {draft.map((r, index) => (
        <div key={index} className="threshold-row">
          <label>
            下界
            <input
              aria-label={`阈值下界 ${index + 1}`}
              type="number"
              value={r.min}
              onChange={(e) =>
                setDraft(
                  draft.map((v, i) =>
                    i === index ? { ...v, min: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label>
            上界
            <input
              aria-label={`阈值上界 ${index + 1}`}
              type="number"
              value={r.max}
              onChange={(e) =>
                setDraft(
                  draft.map((v, i) =>
                    i === index ? { ...v, max: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <input
            aria-label={`阈值颜色 ${index + 1}`}
            type="color"
            value={r.color}
            onChange={(e) =>
              setDraft(
                draft.map((v, i) =>
                  i === index ? { ...v, color: e.target.value } : v,
                ),
              )
            }
          />
          <button
            aria-label={`删除阈值区间 ${index + 1}`}
            onClick={() => setDraft(draft.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <label>
        阈值兜底色
        <input
          aria-label="阈值兜底色"
          type="color"
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
        />
      </label>
      <button
        disabled={draft.length >= 12}
        onClick={() =>
          setDraft([
            ...draft,
            { min: draft.at(-1)?.max || "", max: "", color: layer.color },
          ])
        }
      >
        添加阈值区间
      </button>
      <button
        onClick={() => {
          setDraft(toDraft(defaultThresholds(layer.source, layer.color)));
          setFallback(layer.color);
          setError("");
        }}
      >
        恢复默认阈值
      </button>
      <button
        onClick={() => {
          try {
            const rules = draft.map((r) => ({
              min: r.min === "" ? undefined : Number(r.min),
              max: r.max === "" ? undefined : Number(r.max),
              color: r.color,
            }));
            validateThresholds(rules, fallback);
            onApply({ thresholdRules: rules, thresholdFallback: fallback });
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        应用阈值规则
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
