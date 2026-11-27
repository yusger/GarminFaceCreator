import { useState, useEffect } from "react";
import {metrics} from "./domain";
import { visibilitySources,validateVisibility, type VisibilityCondition } from "./visibility";
export default function VisibilityEditor({
  value,
  onChange,
}: {
  value?: VisibilityCondition;
  onChange: (c: VisibilityCondition | undefined) => void;
}) {
  const [draft, setDraft] = useState<VisibilityCondition>(
      value || { source: "heartRate" },
    ),
    [min, setMin] = useState(value?.min?.toString() || ""),
    [max, setMax] = useState(value?.max?.toString() || ""),
    [error, setError] = useState("");
  const stamp = JSON.stringify(value);
  useEffect(() => {
    setDraft(value || { source: "heartRate" });
    setMin(value?.min?.toString() || "");
    setMax(value?.max?.toString() || "");
    setError("");
  }, [stamp]);
  return (
    <div className="visibility-editor">
      <label className="inline">
        <input
          type="checkbox"
          aria-label="按数据条件显示"
          checked={!!value}
          onChange={(e) =>
            onChange(e.target.checked ? { source: "heartRate" } : undefined)
          }
        />
        按数据条件显示
      </label>
      {value && (
        <>
          <label>
            条件数据源
            <select
              aria-label="条件数据源"
              value={draft.source}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  source: e.target.value as VisibilityCondition["source"],
                })
              }
            >
              {visibilitySources.map(source=><option key={source} value={source}>{metrics[source]}</option>)}
            </select>
          </label>
          <label>
            下限（留空不限）
            <input
              aria-label="条件下限"
              type="number"
              min="0"
              step="any"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </label>
          <label className="inline">
            <input
              type="checkbox"
              aria-label="排除下限值"
              checked={!!draft.minExclusive}
              onChange={(e) =>
                setDraft({ ...draft, minExclusive: e.target.checked })
              }
            />
            排除下限值
          </label>
          <label>
            上限（留空不限）
            <input
              aria-label="条件上限"
              type="number"
              min="0"
              step="any"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
          <label className="inline">
            <input
              type="checkbox"
              aria-label="包含上限值"
              checked={!!draft.maxInclusive}
              onChange={(e) =>
                setDraft({ ...draft, maxInclusive: e.target.checked })
              }
            />
            包含上限值
          </label>
          <label className="inline">
            <input
              type="checkbox"
              aria-label="数据缺失时显示"
              checked={!!draft.missingVisible}
              onChange={(e) =>
                setDraft({ ...draft, missingVisible: e.target.checked })
              }
            />
            数据缺失时显示
          </label>
          <label>
            息屏条件
            <select
              aria-label="息屏条件"
              value={draft.aod || "evaluate"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  aod: e.target.value as VisibilityCondition["aod"],
                })
              }
            >
              <option value="evaluate">按数据判断</option>
              <option value="show">始终通过条件</option>
              <option value="hide">始终不通过</option>
            </select>
          </label>
          <button
            onClick={() => {
              try {
                const c = {
                  ...draft,
                  min: min === "" ? undefined : Number(min),
                  max: max === "" ? undefined : Number(max),
                };
                validateVisibility(c);
                onChange(c);
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            应用显示条件
          </button>
          <small>
            默认包含下限、不含上限；仍受图层的导出与息屏开关控制。未命中的图层不会从工程中移除。
          </small>
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
