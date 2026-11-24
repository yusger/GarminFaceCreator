import { useState } from "react";
import { devices } from "./devices";
export default function DevicePicker({
  onChoose,
  onCancel,
}: {
  onChoose: (device: (typeof devices)[number]) => void;
  onCancel: () => void;
}) {
  const [series, setSeries] = useState("Venu"),
    [model, setModel] = useState("Venu 4"),
    [size, setSize] = useState("45mm");
  const options = devices.filter(
    (d) => d.series === series && d.model === model,
  );
  const selected = options.find((d) => d.size === size) || options[0];
  return (
    <div className="loading">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="选择目标手表"
        style={{
          background: "#171e28",
          padding: 32,
          borderRadius: 16,
          width: 460,
        }}
      >
        <h2>选择目标手表</h2>
        <p>先选择系列，再选择型号与表壳尺寸。</p>
        <label>
          系列
          <select
            aria-label="手表系列"
            value={series}
            onChange={(e) => {
              setSeries(e.target.value);
              setModel(devices.find((d) => d.series === e.target.value)!.model);
              setSize("");
            }}
          >
            {[...new Set(devices.map((d) => d.series))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          型号
          <select
            aria-label="手表型号"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setSize("");
            }}
          >
            {[
              ...new Set(
                devices.filter((d) => d.series === series).map((d) => d.model),
              ),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          尺寸
          <select
            aria-label="手表尺寸"
            value={selected.size}
            onChange={(e) => setSize(e.target.value)}
          >
            {options.map((d) => (
              <option key={d.size}>{d.size}</option>
            ))}
          </select>
        </label>
        <p>
          圆形 AMOLED · {selected.pixels} × {selected.pixels} 像素
        </p>
        <p>编辑器采用 454 × 454 设计坐标，生成代码按目标屏幕缩放。</p>
        <div className="inline">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={() => onChoose(selected)}>
            创建项目
          </button>
        </div>
      </section>
    </div>
  );
}
