import { uid, type Layer } from "./domain.ts";
export function renderChanged(before: Layer[], after: Layer[]) {
  const visual = (layers: Layer[]) =>
    layers
      .filter((l) => l.exportIncluded !== false)
      .map(
        ({
          groupId: _id,
          groupName: _name,
          anchor: _anchor,
          guide: _guide,
          hidden: _hidden,
          ...l
        }) => l,
      );
  return JSON.stringify(visual(before)) !== JSON.stringify(visual(after));
}
export function organizeReferenceLayers(layers: Layer[]): Layer[] {
  const groups = new Map<string, string>();
  return layers.map((l) => {
    const name = l.name;
    const group = name.includes("符文")
      ? "符文秒环"
      : name.includes("十字眼睛")
        ? "十字眼睛"
        : /舌头|口部/.test(name)
          ? "小丑表情"
          : /天光外圈/.test(name)
            ? "天光外圈"
            : /方位刻度|太阳|月亮|月球|轨迹/.test(name)
              ? "天文标记"
              : /图表|柱条|折线/.test(name)
                ? "图表"
                : l.kind === "image" || /背景|底色/.test(name)
                  ? "背景"
                  : [
                        "metric",
                        "text",
                        "time",
                        "date",
                        "wordTime",
                        "calendar",
                        "celestial",
                        "meter",
                      ].includes(l.kind)
                    ? "数据与文字"
                    : "装饰";
    if (!groups.has(group)) groups.set(group, uid());
    return { ...l, groupId: groups.get(group), groupName: group };
  });
}
