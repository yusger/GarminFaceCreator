import { useState } from "react";
import { widgets } from "./widgets";
export default function WidgetPicker({
  onInsert,
  disabled,
}: {
  onInsert: (id: string) => void;
  disabled?: boolean;
}) {
  const [id, setId] = useState(widgets[0].id),
    w = widgets.find((w) => w.id === id)!;
  return (
    <details className="widget-picker">
      <summary>自定义控件</summary>
      <label>
        控件样式
        <select
          aria-label="自定义控件样式"
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          {widgets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <div className="widget-previews">
        <img
          alt={w.name + "亮屏预览"}
          src={"/widgets/" + w.id + "/preview.png"}
        />
        <img
          alt={w.name + "息屏预览"}
          src={"/widgets/" + w.id + "/preview-aod.png"}
        />
      </div>
      <p className="hint">
        原作者参考图；添加后为可编辑图层。颜色和标题开关位于顶部“表盘配置”。
      </p>
      <button disabled={disabled} onClick={() => onInsert(id)}>
        添加控件
      </button>
    </details>
  );
}
