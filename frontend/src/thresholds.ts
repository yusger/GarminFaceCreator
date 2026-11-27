import type { Layer, ThresholdRange } from "./domain";
export function defaultThresholds(
  source: string,
  normal: string,
): ThresholdRange[] {
  return source === "heartRate"
    ? [
        { min: 0, max: 120, color: "#55ff99" },
        { min: 120, max: 150, color: "#ffee44" },
        { min: 150, color: "#ff5566" },
      ]
    : source === "battery"
      ? [
          { min: 0, max: 10, color: "#ff5566" },
          { min: 10, max: 30, color: "#ffee44" },
          { min: 30, color: normal },
        ]
      : [];
}
export function validateThresholds(rules: ThresholdRange[], fallback: string) {
  if (
    !Array.isArray(rules) ||
    rules.length > 12 ||
    !/^#[0-9a-f]{6}$/i.test(fallback)
  )
    throw Error("阈值最多 12 个区间且必须提供兜底色");
  let end = -Infinity;
  for (const [index, rule] of rules.entries()) {
    if (
      !rule ||
      !/^#[0-9a-f]{6}$/i.test(rule.color) ||
      [rule.min, rule.max].some((v) => v !== undefined && !Number.isFinite(v))
    )
      throw Error("阈值颜色或边界无效");
    const min = rule.min ?? -Infinity,
      max = rule.max ?? Infinity;
    if (min >= max || min < end || (index > 0 && min === -Infinity))
      throw Error("阈值须按下界排序，区间不能重叠，下界包含、上界不包含");
    end = max;
  }
}
export function thresholdInk(
  l: Layer,
  value: number | undefined,
  missing = false,
) {
  if (!l.threshold || !["metric","meter"].includes(l.kind)) return l.color;
  const fallback = l.thresholdFallback || l.color;
  if (missing || !Number.isFinite(value)) return fallback;
  const rules = l.thresholdRules ?? defaultThresholds(l.source, l.color);
  try {
    validateThresholds(rules, fallback);
  } catch {
    return fallback;
  }
  return (
    rules.find(
      (r) => value! >= (r.min ?? -Infinity) && value! < (r.max ?? Infinity),
    )?.color || fallback
  );
}
