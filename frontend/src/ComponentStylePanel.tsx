import { useState } from "react";
import type { Layer, Project } from "./domain";
import {
  createComponentStyle,
  bindComponentStyle,
  publishComponentStyle,
  detachComponentStyle,
  deleteComponentStyle,
} from "./componentStyles";
export default function ComponentStylePanel({
  project: p,
  layer: l,
  onChange,
}: {
  project: Project;
  layer: Layer;
  onChange: (p: Project) => void;
}) {
  const [name, setName] = useState("组件主样式"),
    [chosen, setChosen] = useState(""),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const def = p.componentStyles?.find((s) => s.id === l.componentStyle?.id),
    pick = p.componentStyles?.find((s) => s.id === chosen),
    disabled = l.locked || p.multiDevice?.scope === "device";
  const act = (f: () => Project) => {
    try {
      const next = f();
      onChange(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <details className="appearance-roles">
      <summary>组件主样式与实例</summary>
      <p className="hint">
        同步内部几何、配色与AOD外观，保留实例位置、数据源、配置覆盖和部件开关。原有来源与许可始终保留。字体和结构不在此样式中同步。
      </p>
      {def ? (
        <>
          <p>
            {def.name} · v{def.version} ·{" "}
            {p.layers.filter((a) => a.componentStyle?.id === def.id).length}
            个实例
          </p>
          <button
            disabled={disabled}
            onClick={() => act(() => publishComponentStyle(p, l.id))}
          >
            用当前外观更新全部实例
          </button>
          <button
            disabled={disabled}
            onClick={() => act(() => detachComponentStyle(p, l.id))}
          >
            脱离主样式
          </button>
        </>
      ) : (
        <>
          <label>
            主样式名称
            <input
              aria-label="主样式名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </label>
          <button
            disabled={disabled || !name.trim()}
            onClick={() => act(() => createComponentStyle(p, l.id, name))}
          >
            创建并关联主样式
          </button>
          <label>
            选择组件主样式
            <select
              aria-label="选择组件主样式"
              value={chosen}
              onChange={(e) => {
                setChosen(e.target.value);
                setMapping({});
              }}
            >
              <option value="">请选择</option>
              {p.componentStyles?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · v{s.version}
                </option>
              ))}
            </select>
          </label>
          {pick && (
            <>
              <p className="hint">
                请逐项确认插槽对应关系；不会按图层顺序猜测。
              </p>
              {pick.slots.map((slot) => (
                <label key={slot.key}>
                  {slot.name}
                  <select
                    aria-label={"映射插槽 " + slot.key}
                    value={mapping[slot.key] || ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [slot.key]: e.target.value })
                    }
                  >
                    <option value="">请选择内部部件</option>
                    {l
                      .compound!.layers.filter((c) => c.kind === slot.kind)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              <button
                disabled={disabled}
                onClick={() =>
                  act(() => bindComponentStyle(p, l.id, pick.id, mapping))
                }
              >
                关联并应用主样式
              </button>
              <button
                disabled={
                  disabled ||
                  p.layers.some((a) => a.componentStyle?.id === pick.id)
                }
                onClick={() => act(() => deleteComponentStyle(p, pick.id))}
              >
                删除未使用的主样式
              </button>
            </>
          )}
        </>
      )}
      {l.componentStyle && !def && (
        <p role="alert">关联的主样式缺失，项目需要修复，不能静默替换外观。</p>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
