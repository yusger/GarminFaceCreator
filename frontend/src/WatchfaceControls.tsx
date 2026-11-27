import type { Project } from "./domain";
import { controlValue, setControl, resetControls, setSourceDecoration } from "./projectControls";
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
            <div key={c.id}><label>
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
            {c.type === "dataSource" && p.layers.some(l=>l.kind==="image" && !l.weatherIcon && !l.locked && l.exportIncluded!==false) && (
              <details data-source-decoration>
                <summary>{c.label}的图标联动</summary>
                <p className="hint">勾选的静态图标仅在此配置为默认数据源时显示，切换后亮屏/AOD均隐藏；恢复默认后还原。不会自动改画其他图标。</p>
                {p.layers.filter(l=>l.kind==="image" && !l.weatherIcon && !l.locked && l.exportIncluded!==false).map(l=><label key={l.id} className="inline"><input type="checkbox" aria-label={`切换${c.label}时隐藏${l.name}`} checked={!!c.hideWhenChangedFromDefault?.includes(l.id)} onChange={e=>onChange(setSourceDecoration(p,c.id,l.id,e.target.checked))}/>{l.name}</label>)}
              </details>
            )}
            </div>
          ))}
        </fieldset>
        {p.multiDevice?.scope === "device" && <p>请切换共享主设计后修改。</p>}
        <button
          disabled={p.multiDevice?.scope === "device"}
          onClick={() => onChange(resetControls(p))}
        >
          恢复默认配置
        </button>
      </div>
    </details>
  );
}
