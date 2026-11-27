import { readLocalImage } from "./localImage";
import { useState, useRef, useEffect } from "react";
import type { Layer } from "./domain";
import VisibilityEditor from "./VisibilityEditor";
import { setPartCondition, setPartColor, setPartImage } from "./stateMapping";
export default function StateMappingEditor({
  layer: l,
  onChange,
}: {
  layer: Layer;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const latest = useRef({ layer: l, onChange }),
    alive = useRef(true),
    request = useRef(0);
  latest.current = { layer: l, onChange };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [selected, setSelected] = useState(""),
    [color, setColor] = useState("#45D6BE"),
    [error, setError] = useState("");
  const b = l.compound!,
    part = b.parts.find((p) => p.id === selected) || b.parts[0],
    children = b.layers.filter((c) => part.layerIds.includes(c.id));
  const common = children.every(
    (c) =>
      JSON.stringify(c.visibility) === JSON.stringify(children[0]?.visibility),
  );
  function apply(action: () => Partial<Layer>) {
    try {
      onChange(action());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <details className="state-mapping-editor">
      <summary>数据状态映射</summary>
      <p className="hint">
        按数据区间切换内部部件；多个匹配部件会同时显示。部件总开关及亮屏/AOD开关继续生效。
      </p>
      <label>
        状态部件
        <select
          aria-label="状态映射部件"
          value={part.id}
          onChange={(e) => setSelected(e.target.value)}
        >
          {b.parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {!common && <p>此部件条件不同，应用后统一所选部件条件。</p>}
      <VisibilityEditor
        key={part.id}
        value={children[0]?.visibility}
        onChange={(v) => apply(() => setPartCondition(l, part.id, v))}
      />
      <label>
        状态配色
        <input
          type="color"
          aria-label="状态配色"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </label>
      <button onClick={() => apply(() => setPartColor(l, part.id, color))}>
        应用所选状态配色
      </button>
      <p className="hint">
        配色用于矢量与文字，彩色位图保留原图。可在内部编辑中为不同状态选择各自图层；不以状态颜色替换图片内容。
      </p>
      {children.filter((c) => c.kind === "image").length === 1 && (
        <label>
          状态图片
          <input
            type="file"
            aria-label="状态图片"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const token = ++request.current,
                stamp = JSON.stringify(l),
                id = part.id;
              try {
                const data = await readLocalImage(file);
                if (!alive.current || token !== request.current) return;
                if (JSON.stringify(latest.current.layer) !== stamp)
                  throw Error("读取期间控件已变化，请重新选择状态图片");
                latest.current.onChange(
                  setPartImage(latest.current.layer, id, data),
                );
                setError("");
              } catch (e) {
                if (alive.current && token === request.current)
                  setError((e as Error).message);
              }
            }}
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
