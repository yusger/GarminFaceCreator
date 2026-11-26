import { useState } from "react";
import type { Project } from "./domain";
import { circleLayout, distributeLayers, type CircleOptions } from "./arrange";
export default function ArrangeTools({
  project,
  selection,
  onChange,
  onError,
}: {
  project: Project;
  selection: string[];
  onChange: (p: Project) => void;
  onError: (s: string) => void;
}) {
  const [o, setO] = useState<CircleOptions>({
    cx: 227,
    cy: 227,
    radius: 160,
    start: 0,
    sweep: 360,
    count: 12,
    rotate: false,
  });
  const count = project.layers.filter(
    (l) => selection.includes(l.id) && !l.locked,
  ).length;
  function run(action: () => Project) {
    try {
      onChange(action());
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <details className="arrange-tools">
      <summary>排列工具</summary>
      <div className="arrange-popover">
        <b>等距分布</b>
        <p>按旋转后的外框留等距空隙，首尾固定；锁定控件不参与。</p>
        <div>
          <button
            disabled={count < 3}
            onClick={() =>
              run(() => ({
                ...project,
                layers: distributeLayers(project.layers, selection, "x"),
              }))
            }
          >
            水平等距分布
          </button>
          <button
            disabled={count < 3}
            onClick={() =>
              run(() => ({
                ...project,
                layers: distributeLayers(project.layers, selection, "y"),
              }))
            }
          >
            垂直等距分布
          </button>
        </div>
        <b>圆周排版</b>
        {(
          [
            ["cx", "圆心X"],
            ["cy", "圆心Y"],
            ["radius", "圆周半径"],
            ["start", "起始角度"],
            ["sweep", "覆盖角度"],
            ["count", "份数含原件"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              aria-label={label}
              type="number"
              value={o[key]}
              min={key === "count" ? 2 : undefined}
              max={key === "count" ? 120 : undefined}
              onChange={(e) => setO({ ...o, [key]: Number(e.target.value) })}
            />
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={o.rotate}
            onChange={(e) => setO({ ...o, rotate: e.target.checked })}
          />
          随角度旋转
        </label>
        <p>
          0°在12点，顺时针。整圈不重复终点，弧段包含首尾。复合控件保留整体；不支持整体旋转。
        </p>
        <div>
          <button
            disabled={count !== 1}
            onClick={() => run(() => circleLayout(project, selection, o, true))}
          >
            圆周复制
          </button>
          <button
            disabled={count < 2}
            onClick={() =>
              run(() => circleLayout(project, selection, o, false))
            }
          >
            圆周分布
          </button>
        </div>
        <p>复制份数包含原件，副本保留当前样式并独立编辑；整轮操作可撤销。</p>
      </div>
    </details>
  );
}
