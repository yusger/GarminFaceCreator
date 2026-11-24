import Meter from "./Meter";
import LibraryImage from "./LibraryImage";
import { Fragment, useState } from "react";
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import type { Layer } from "./domain";
import { reading, ink, metricValues, type Preview } from "./Scene";
function Thumbnail({ layer: l, preview }: { layer: Layer; preview: Preview }) {
  const w = Math.max(10, l.w),
    h = Math.max(10, l.h),
    stroke = Math.max(w, h) * 0.045;
  return (
    <svg
      className="layer-thumbnail"
      role="img"
      aria-label={`图层缩略图 ${l.name}`}
      viewBox={`0 0 ${w} ${h}`}
    >
      {l.kind === "meter" ? (
        <Meter
          layer={l}
          value={metricValues(preview)[l.source]}
          missing={preview.missing}
        />
      ) : l.kind === "image" ? (
        <LibraryImage
          layer={{ ...l, w, h }}
          condition={preview.weatherCondition}
          missing={preview.missing}
        />
      ) : l.kind === "line" ? (
        <line
          x1={0}
          y1={0}
          x2={w}
          y2={h}
          stroke={l.strokeEnabled === false ? "none" : l.strokeColor || l.color}
          strokeWidth={stroke}
          strokeOpacity={l.opacity ?? 1}
        />
      ) : l.kind === "ring" ? (
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={w * 0.43}
          ry={h * 0.43}
          fill="none"
          stroke={l.color}
          strokeWidth={stroke}
          strokeDasharray={`${stroke * 1.4} ${stroke}`}
        />
      ) : l.kind === "circle" ? (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={l.color} />
      ) : l.kind === "rect" ? (
        <rect
          width={w}
          height={h}
          fill={l.fillEnabled === false ? "none" : l.color}
          fillOpacity={l.opacity ?? 1}
          stroke={l.strokeEnabled ? l.strokeColor || l.color : "none"}
          strokeWidth={stroke}
          strokeOpacity={l.opacity ?? 1}
        />
      ) : (
        <text
          x={w / 2}
          y={h / 2}
          dominantBaseline="central"
          textAnchor="middle"
          fill={ink(l, preview)}
          fontSize={Math.min(
            h * 0.85,
            (w / Math.max(1, reading(l, preview).length)) * 1.6,
          )}
        >
          {reading(l, preview)}
        </text>
      )}
    </svg>
  );
}
export default function LayerList({
  layers,
  selection,
  preview,
  onSelect,
  onSelectGroup,
  onChange,
}: {
  layers: Layer[];
  selection: string[];
  preview: Preview;
  onSelect: (id: string, additive: boolean) => void;
  onSelectGroup: (ids: string[], additive: boolean) => void;
  onChange: (layers: Layer[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  return (
    <div className="layer-list">
      {layers.map((l, index) => {
        const group = l.groupId,
          first =
            group &&
            layers.findIndex((item) => item.groupId === group) === index,
          members = group
            ? layers.filter((item) => item.groupId === group)
            : [];
        return (
          <Fragment key={l.id}>
            {first && (
              <div className="layer-group">
                <button
                  aria-label={`${collapsed.includes(group) ? "展开" : "折叠"}分组 ${l.groupName}`}
                  onClick={() =>
                    setCollapsed(
                      collapsed.includes(group)
                        ? collapsed.filter((id) => id !== group)
                        : [...collapsed, group],
                    )
                  }
                >
                  {collapsed.includes(group) ? "▸" : "▾"}
                </button>
                <button
                  className="group-name"
                  aria-label={`选择分组 ${l.groupName}`}
                  onClick={(e) =>
                    onSelectGroup(
                      members.map((item) => item.id),
                      e.shiftKey,
                    )
                  }
                >
                  {l.groupName || "分组"} <small>{members.length}</small>
                </button>
                <button
                  aria-label={`重命名分组 ${l.groupName}`}
                  onClick={() => {
                    const name = prompt("分组名称", l.groupName || "分组");
                    if (name?.trim())
                      onChange(
                        layers.map((item) =>
                          item.groupId === group
                            ? { ...item, groupName: name.trim().slice(0, 80) }
                            : item,
                        ),
                      );
                  }}
                >
                  ✎
                </button>
                <button
                  aria-label={`取消分组 ${l.groupName}`}
                  onClick={() =>
                    onChange(
                      layers.map((item) =>
                        item.groupId === group
                          ? {
                              ...item,
                              groupId: undefined,
                              groupName: undefined,
                            }
                          : item,
                      ),
                    )
                  }
                >
                  ×
                </button>
              </div>
            )}
            {(!group || !collapsed.includes(group)) && (
              <div
                className={`layer-row ${selection.includes(l.id) ? "selected" : ""} ${group ? "grouped" : ""}`}
                onClick={(e) => onSelect(l.id, e.shiftKey)}
              >
                <Thumbnail layer={l} preview={preview} />
                <span>{l.name}</span>
                {l.exportIncluded === false && (
                  <small title="不包含在原生导出">
                    {l.guide ? "辅助" : "不导出"}
                  </small>
                )}
                <button
                  aria-label={`隐藏 ${l.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(
                      layers.map((item) =>
                        item.id === l.id
                          ? { ...item, hidden: !item.hidden }
                          : item,
                      ),
                    );
                  }}
                >
                  {l.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  aria-label={`锁定 ${l.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(
                      layers.map((item) =>
                        item.id === l.id
                          ? { ...item, locked: !item.locked }
                          : item,
                      ),
                    );
                  }}
                >
                  {l.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
                <button
                  title="上移图层"
                  disabled={!index}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = [...layers];
                    [next[index], next[index - 1]] = [
                      next[index - 1],
                      next[index],
                    ];
                    onChange(next);
                  }}
                >
                  ↑
                </button>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
