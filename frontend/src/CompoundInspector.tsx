import StateMappingEditor from "./StateMappingEditor";
import { useState } from "react";
import type { Layer, Project } from "./domain";
import { resolveControls } from "./projectControls";
import type { WidgetPart } from "./compound";
export default function CompoundInspector({
  layer: l,
  project: p,
  onChange,
  onDecompose,
}: {
  layer: Layer;
  project: Project;
  onChange: (patch: Partial<Layer>) => void;
  onDecompose: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [childId, setChildId] = useState("");
  const b = l.compound!;
  const disabled = l.locked || p.multiDevice?.scope === "device";
  const resolved = resolveControls({
    ...p,
    layers: b.layers,
    controls: b.controls,
    controlValues: b.controlValues,
  }).layers;
  const child = resolved.find((c) => c.id === childId) || resolved[0];
  function partPatch(id: string, patch: Partial<WidgetPart>) {
    onChange({
      compound: {
        ...b,
        parts: b.parts.map((part) =>
          part.id === id ? { ...part, ...patch } : part,
        ),
      },
    });
  }
  function childPatch(patch: Partial<Layer>) {
    if (["unit","precision","label","metricDecoration"].some(k=>k in patch) && patch.autoSourceFormat === undefined) patch={...patch,autoSourceFormat:false};
    const values = { ...b.controlValues };
    for (const c of b.controls)
      for (const t of c.targets)
        if (t.layerId === child.id && t.property === "color" && patch.color)
          values[c.id] = patch.color;
    onChange({
      compound: {
        ...b,
        controlValues: values,
        parts: b.parts.map((part) =>
          part.layerIds.includes(child.id)
            ? {
                ...part,
                ...(patch.aod !== undefined ? { aod: undefined } : {}),
                ...(patch.activeVisible !== undefined
                  ? { active: undefined }
                  : {}),
              }
            : part,
        ),
        layers: b.layers.map((c) =>
          c.id === child.id ? { ...c, ...patch } : c,
        ),
      },
    });
  }
  const sourceNames = {
    heartRate: "心率",
    steps: "步数",
    calories: "总热量",
    battery: "电量",
    distance: "每日距离",
    seconds: "秒数",
  };
  return (
    <div className="compound-inspector">
      <p className="hint">
        复合控件 · 独立对象。部件隐藏后保留原位置，整体等比缩放。
      </p>
      <fieldset disabled={l.locked}>
        <label>
          控件名称
          <input
            disabled={disabled}
            aria-label="复合控件名称"
            value={l.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
        <div className="numeric-grid">
          {(["x", "y", "w", "h"] as const).map((k) => (
            <label key={k}>
              {{ x: "X", y: "Y", w: "宽度", h: "高度" }[k]}
              <input
                aria-label={"复合控件" + k}
                type="number"
                value={Number(l[k].toFixed(2))}
                min={k === "w" || k === "h" ? 10 : undefined}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (
                    !Number.isFinite(v) ||
                    ((k === "w" || k === "h") && v < 10)
                  )
                    return;
                  onChange(
                    k === "w"
                      ? { w: v, h: (v * b.height) / b.width }
                      : k === "h"
                        ? { h: v, w: (v * b.width) / b.height }
                        : { [k]: v },
                  );
                }}
              />
            </label>
          ))}
        </div>
        <label className="inline">
          <input
            disabled={p.multiDevice?.scope === "device"}
            aria-label="整个控件亮屏显示"
            type="checkbox"
            checked={l.activeVisible !== false}
            onChange={(e) => onChange({ activeVisible: e.target.checked })}
          />
          亮屏显示
        </label>
        <label className="inline">
          <input
            aria-label="整个控件息屏显示"
            type="checkbox"
            checked={l.aod}
            onChange={(e) => onChange({ aod: e.target.checked })}
          />
          息屏显示
        </label>
      </fieldset>
      {p.multiDevice?.scope === "device" && (
        <p className="hint">
          设备微调可修改整体位置和大小；部件及配置在共享主设计中修改。
        </p>
      )}
      <fieldset disabled={disabled}>
        <h4>控件配置</h4>
        {b.controls.map((c) => (
          <label key={c.id}>
            {c.label.split(" · ").at(-1)}
            {c.type === "color" ? (
              <input
                aria-label="控件主题色"
                type="color"
                value={String(b.controlValues?.[c.id] ?? c.default)}
                onChange={(e) =>
                  onChange({
                    compound: {
                      ...b,
                      controlValues: {
                        ...b.controlValues,
                        [c.id]: e.target.value.toUpperCase(),
                      },
                    },
                  })
                }
              />
            ) : c.type === "dataSource" ? (
              <select
                value={String(b.controlValues?.[c.id] ?? c.default)}
                onChange={(e) =>
                  onChange({
                    compound: {
                      ...b,
                      controlValues: {
                        ...b.controlValues,
                        [c.id]: e.target.value,
                      },
                    },
                  })
                }
              >
                {c.options?.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : <input type="checkbox" aria-label={c.label} checked={Boolean(b.controlValues?.[c.id] ?? c.default)} onChange={e=>onChange({compound:{...b,controlValues:{...b.controlValues,[c.id]:e.target.checked}}})}/>}
          </label>
        ))}
        <StateMappingEditor layer={l} onChange={onChange}/>
        <h4>内部部件</h4>
        <p className="hint">
          “启用”同时控制亮屏和息屏；不勾选时保留部件配置。息屏的混合状态沿用原设计。
        </p>
        <div className="compound-part-head">
          <span>部件</span>
          <span>启用</span>
          <span>亮屏</span>
          <span>息屏</span>
        </div>
        {b.parts.map((part) => {
          const ls = resolved.filter((c) => part.layerIds.includes(c.id));
          const active =
              part.active ?? ls.some((c) => c.activeVisible !== false),
            aod = part.aod ?? ls.some((c) => c.aod);
          const mixed =
            part.aod === undefined &&
            ls.some((c) => c.aod) &&
            ls.some((c) => !c.aod);
          return (
            <div className="compound-part" key={part.id}>
              <span>{part.name}</span>
              <input
                aria-label={part.name + " 启用"}
                type="checkbox"
                checked={part.enabled}
                onChange={(e) =>
                  partPatch(part.id, { enabled: e.target.checked })
                }
              />
              <input
                aria-label={part.name + " 亮屏"}
                type="checkbox"
                disabled={!part.enabled}
                checked={active}
                onChange={(e) =>
                  partPatch(part.id, { active: e.target.checked })
                }
              />
              <input
                aria-label={part.name + " 息屏"}
                title={mixed ? "部分部件显示，沿用原设计" : undefined}
                ref={(el) => {
                  if (el) el.indeterminate = mixed;
                }}
                type="checkbox"
                disabled={!part.enabled}
                checked={aod}
                onChange={(e) => partPatch(part.id, { aod: e.target.checked })}
              />
            </div>
          );
        })}
        <button type="button" onClick={() => setEditing(!editing)}>
          {editing ? "收起内部编辑" : "编辑内部结构"}
        </button>
        {editing && (
          <div className="compound-inner">
            <p className="hint">
              内部编辑仍保存在同一个复合对象中。需要自由调整结构时，可拆解为基础图层。
            </p>
            <label>
              内部图层
              <select
                aria-label="复合控件内部图层"
                value={child.id}
                onChange={(e) => setChildId(e.target.value)}
              >
                {resolved.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline">
              <input
                aria-label="内部部件启用"
                type="checkbox"
                checked={!b.disabledLayers?.includes(child.id)}
                onChange={(e) =>
                  onChange({
                    compound: {
                      ...b,
                      disabledLayers: e.target.checked
                        ? (b.disabledLayers || []).filter(
                            (id) => id !== child.id,
                          )
                        : [...(b.disabledLayers || []), child.id],
                    },
                  })
                }
              />
              启用此内部部件
            </label>
            <label className="inline">
              <input
                aria-label="内部部件亮屏显示"
                type="checkbox"
                checked={child.activeVisible !== false}
                onChange={(e) =>
                  childPatch({ activeVisible: e.target.checked })
                }
              />
              亮屏显示
            </label>
            <label className="inline">
              <input
                aria-label="内部部件息屏显示"
                type="checkbox"
                checked={child.aod}
                onChange={(e) => childPatch({ aod: e.target.checked })}
              />
              息屏显示
            </label>
            <label>
              部件颜色
              <input
                aria-label="内部部件颜色"
                type="color"
                value={child.color}
                onChange={(e) => childPatch({ color: e.target.value })}
              />
            </label>
            {child.kind === "text" && (
              <label>
                文字内容
                <input
                  aria-label="内部文字内容"
                  value={child.text}
                  onChange={(e) => childPatch({ text: e.target.value })}
                />
              </label>
            )}
            {child.kind === "metric" && (
              <>
                <label>
                  数据源
                  <select
                    aria-label="内部数据源"
                    value={child.source}
                    onChange={(e) => {
                      const source = e.target.value;
                      childPatch({
                        source,
                        unit: (
                          {
                            heartRate: "bpm",
                            steps: "",
                            calories: "kcal",
                            battery: "%",
                            distance: "km",
                            seconds: "s",
                          } as Record<string, string>
                        )[source],
                        precision: source === "distance" ? 1 : 0,
                        ...(source === "seconds"
                          ? { aodSeconds: "hide" as const }
                          : {}),
                      });
                    }}
                  >
                    {Object.entries(sourceNames).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  单位
                  <input
                    aria-label="内部数据单位"
                    value={child.unit || ""}
                    onChange={(e) => childPatch({ unit: e.target.value })}
                  />
                </label>
                <label>
                  小数位
                  <input
                    aria-label="内部数据精度"
                    type="number"
                    min="0"
                    max="3"
                    value={child.precision ?? 0}
                    onChange={(e) =>
                      childPatch({
                        precision: Math.max(
                          0,
                          Math.min(3, Math.round(Number(e.target.value) || 0)),
                        ),
                      })
                    }
                  />
                </label>
              </>
            )}
          </div>
        )}
      </fieldset>
      <button
        disabled={disabled}
        className="compound-decompose"
        onClick={onDecompose}
      >
        拆解为基础图层
      </button>
    </div>
  );
}
