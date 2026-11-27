import {
  activeTheme,
  themeControls,
  selectTheme,
  resetTheme,
  themeLayers,
} from "./themes";
import { useState } from "react";
import { createDataSlot, allowedSlotSources } from "./dataSlots";
import type { Project } from "./domain";
import {
  controlValue,
  setControl,
  resetControls,
  setSourceDecoration,
  setSourceIcon,
} from "./projectControls";
export default function WatchfaceControls({
  project: p,
  onChange,
}: {
  project: Project;
  onChange: (p: Project) => void;
}) {
  const [members, setMembers] = useState<string[]>([]),
    [error, setError] = useState("");
  const eligible = themeLayers(p).filter(
    (l) =>
      !l.locked &&
      !l.sourceLocked &&
      allowedSlotSources(l).length &&
      !p.controls?.some((c) =>
        c.targets.some((t) => t.layerId === l.id && t.property === "source"),
      ),
  );
  return (
    <details className="watchface-controls">
      <summary>表盘配置</summary>
      <div role="group" aria-label="表盘配置项">
        <p>配置同时用于预览和生成工程；修改后请重新生成代码。</p>
        <fieldset disabled={p.multiDevice?.scope === "device"}>
          {p.themes && (
            <label>
              主题预设
              <select
                aria-label="主题预设"
                value={activeTheme(p)?.id}
                onChange={(e) => onChange(selectTheme(p, e.target.value))}
              >
                {p.themes.presets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {themeControls(p).map((c) => (
            <div key={c.id}>
              <label>
                {c.label}
                {c.slot ? " · 联动数据槽" : ""}
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
                      onChange(
                        setControl(p, c.id, e.target.value.toUpperCase()),
                      )
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
              {c.type === "dataSource" &&
                themeLayers(p).some(
                  (l) =>
                    l.kind === "image" &&
                    !l.weatherIcon &&
                    !l.locked &&
                    l.exportIncluded !== false,
                ) && (
                  <details data-source-decoration>
                    <summary>{c.label}的图标联动</summary>
                    <p className="hint">
                      勾选的静态图标仅在此配置为默认数据源时显示，切换后亮屏/AOD均隐藏；恢复默认后还原。不会自动改画其他图标。
                    </p>
                    {p.layers
                      .filter(
                        (l) =>
                          l.kind === "image" &&
                          !l.weatherIcon &&
                          !l.locked &&
                          l.exportIncluded !== false,
                      )
                      .map((l) => (
                        <label key={l.id} className="inline">
                          <input
                            type="checkbox"
                            aria-label={`切换${c.label}时隐藏${l.name}`}
                            checked={
                              !!c.hideWhenChangedFromDefault?.includes(l.id)
                            }
                            onChange={(e) =>
                              onChange(
                                setSourceDecoration(
                                  p,
                                  c.id,
                                  l.id,
                                  e.target.checked,
                                ),
                              )
                            }
                          />
                          {l.name}
                        </label>
                      ))}
                  </details>
                )}
              {c.type === "dataSource" && (
                <details>
                  <summary>{c.label}按来源选择图标</summary>
                  <p className="hint">
                    为每个静态图标选择其对应来源；不匹配时隐藏。固定显示不受来源影响。
                  </p>
                  {themeLayers(p)
                    .filter(
                      (l) => l.kind === "image" && !l.weatherIcon && !l.locked,
                    )
                    .map((l) => (
                      <label key={l.id}>
                        {l.name}
                        <select
                          aria-label={c.label + "的来源图标 " + l.name}
                          value={
                            Object.entries(c.sourceIcons || {}).find(
                              ([, ids]) => ids.includes(l.id),
                            )?.[0] || ""
                          }
                          onChange={(e) => {
                            try {
                              onChange(
                                setSourceIcon(
                                  p,
                                  c.id,
                                  l.id,
                                  e.target.value || undefined,
                                ),
                              );
                              setError("");
                            } catch (err) {
                              setError((err as Error).message);
                            }
                          }}
                        >
                          <option value="">固定显示</option>
                          {c.options?.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                </details>
              )}
            </div>
          ))}
          {!!eligible.length && (
            <details>
              <summary>创建联动数据槽</summary>
              <p className="hint">
                勾选相同来源的读数和进度。选项按控件能力取交集；目标为设计值，不代表设备个性化目标。
              </p>
              {eligible.map((l) => (
                <label key={l.id}>
                  <input
                    type="checkbox"
                    checked={members.includes(l.id)}
                    onChange={(e) =>
                      setMembers((v) =>
                        e.target.checked
                          ? [...v, l.id]
                          : v.filter((id) => id !== l.id),
                      )
                    }
                  />
                  {l.name}
                </label>
              ))}
              <button
                type="button"
                disabled={!members.length}
                onClick={() => {
                  try {
                    onChange(createDataSlot(p, members));
                    setMembers([]);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                创建数据槽
              </button>
              {error && <p role="alert">{error}</p>}
            </details>
          )}
        </fieldset>
        {p.multiDevice?.scope === "device" && <p>请切换共享主设计后修改。</p>}
        <button
          disabled={p.multiDevice?.scope === "device"}
          onClick={() => onChange(p.themes ? resetTheme(p) : resetControls(p))}
        >
          {p.themes ? "恢复当前主题默认值" : "恢复默认配置"}
        </button>
      </div>
    </details>
  );
}
