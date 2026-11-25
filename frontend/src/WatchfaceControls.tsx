import type { Project } from "./domain";
import { controlValue, setControl } from "./projectControls";
export default function WatchfaceControls({
  project: p,
  onChange,
}: {
  project: Project;
  onChange: (p: Project) => void;
}) {
  if (!p.controls?.length) return null;
  return (
    <details className="watchface-controls">
      <summary>表盘配置</summary>
      <div role="group" aria-label="表盘配置项">
        <p>配置同时用于预览和生成工程；修改后请重新生成代码。</p>
        <fieldset disabled={p.multiDevice?.scope === "device"}>
          {p.controls.map((c) => (
            <label key={c.id}>
              {c.label}
              {c.type === "boolean" ? (
                <input
                  aria-label={c.label}
                  type="checkbox"
                  checked={controlValue(p, c) === true}
                  onChange={(e) =>
                    onChange(setControl(p, c.id, e.target.checked))
                  }
                />
              ) : c.type === "color" ? (
                <input
                  aria-label={c.label}
                  type="color"
                  value={String(controlValue(p, c))}
                  onChange={(e) =>
                    onChange(setControl(p, c.id, e.target.value.toUpperCase()))
                  }
                />
              ) : (
                <select
                  aria-label={c.label}
                  value={String(controlValue(p, c))}
                  onChange={(e) =>
                    onChange(setControl(p, c.id, e.target.value))
                  }
                >
                  {c.options?.map((v) => (
                    <option key={v} value={v}>
                      {{
                        steps: "步数",
                        calories: "当日总热量",
                        distance: "当日距离",
                        battery: "电量",
                        heartRate: "心率",
                        temperature: "天气温度",
                        seconds: "秒数",
                      }[v] || v}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </fieldset>
        {p.multiDevice?.scope === "device" && <p>请切换共享主设计后修改。</p>}
        <button
          disabled={p.multiDevice?.scope === "device"}
          onClick={() =>
            onChange({
              ...p,
              controlValues: undefined,
              revision: p.revision + 1,
              codeRevision: -1,
              updated: Date.now(),
            })
          }
        >
          恢复默认配置
        </button>
      </div>
    </details>
  );
}
