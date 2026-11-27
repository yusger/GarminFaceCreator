import { useEffect, useState } from "react";
import { regularPolygon, validPolygon } from "./geometry";
export default function PolygonEditor({
  points,
  onChange,
}: {
  points: [number, number][];
  onChange: (p: [number, number][]) => void;
}) {
  const [text, setText] = useState(JSON.stringify(points)),
    [error, setError] = useState("");
  useEffect(() => {
    setText(JSON.stringify(points));
    setError("");
  }, [JSON.stringify(points)]);
  return (
    <fieldset>
      <legend>凸多边形</legend>
      <label>
        预设
        <select
          aria-label="多边形预设"
          value=""
          onChange={(e) =>
            onChange(
              e.target.value === "trapezoid"
                ? [
                    [0.2, 0],
                    [0.8, 0],
                    [1, 1],
                    [0, 1],
                  ]
                : regularPolygon(Number(e.target.value)),
            )
          }
        >
          <option value="" disabled>
            选择外形
          </option>
          {[3, 4, 5, 6, 8, 12].map((n) => (
            <option key={n} value={n}>
              正{n}边形
            </option>
          ))}
          <option value="trapezoid">梯形</option>
        </select>
      </label>
      <label>
        顶点坐标
        <textarea
          aria-label="多边形顶点"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            try {
              const v = JSON.parse(text);
              if (!validPolygon(v)) throw Error();
              onChange(v);
              setError("");
            } catch {
              setError(
                "须为3–32个[0,1]坐标对，按轮廓顺序形成凸多边形，不可相交或重复。",
              );
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <small>
        坐标相对当前宽高归一化，拖动缩放保持外形；支持填充、描边、旋转及AOD。凹多边形与任意SVG路径尚未开放。
      </small>
    </fieldset>
  );
}
