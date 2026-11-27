import type { Project, Layer } from "./domain.ts";
import { sourceSlotLayer } from "./dataSlots.ts";
import { metricDisplayUnits, metricDecorations } from "./metricFormat.ts";
import { resolvedLayer, sourceLabelText } from "./projectControls.ts";
export function requiredFontGlyphs(p: Project, l: Layer) {
  const choices = (id: string, source: string) => [
    ...new Set([
      source,
      ...(p.controls || [])
        .filter(
          (c) =>
            c.type === "dataSource" &&
            c.targets.some((t) => t.layerId === id && t.property === "source"),
        )
        .flatMap((c) => c.options || []),
    ]),
  ];
  let glyphs = "";
  if (l.kind === "chart")
    glyphs =
      "0123456789.:*- kM|/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz " +
      (l.chart?.title || "");
  else if (l.kind === "time") glyphs = "0123456789:";
  else if (l.kind === "date")
    glyphs =
      l.dateFormat === "monthDayWeek"
        ? "0123456789. SUNMONTUEWEDTHUFRISAT"
        : l.dateLocale === "zh"
          ? "0123456789 周日一二三四五六月"
          : "0123456789 SUNMONTUEWEDTHUFRISAT";
  else if (l.kind === "text") {
    const owner = p.layers.find((x) => x.id === l.sourceLabelFor);
    glyphs = owner
      ? choices(owner.id, owner.source)
          .map((source) => sourceLabelText(l, source, p.controls))
          .join("")
      : l.text || " ";
  } else
    glyphs = choices(l.id, l.source)
      .map((source) => {
        const slot = p.controls?.find(
          (c) => c.slot && c.targets.some((t) => t.layerId === l.id),
        );
        const current = resolvedLayer(
          slot ? sourceSlotLayer(p, l, slot, source) : { ...l, source },
          p.layers,
        );
        return (
          "0123456789-. " + (source==="moonIllumination"?"~":"") +
          (["sunrise", "sunset"].includes(source) ? ":" : "") +
          (current.groupThousands !== false ? "," : "") +
          (current.label || "") +
          (current.unit ?? metricDisplayUnits[source] ?? "") +
          (current.missingValue ?? "--") +
          (current.metricDecoration !== false
            ? metricDecorations[source] || ""
            : "")
        );
      })
      .join("");
  if (
    l.garminFont === "chalk" &&
    /[^\x20-\x7e°]/.test(
      (l.text || "") +
        (l.label || "") +
        (l.unit || "") +
        (l.missingValue || ""),
    )
  )
    throw Error("粉笔数字字体支持 ASCII 与 °；中文请使用粉笔中文字体");

  if(l.bitmapTabular)glyphs+="0123456789";
  return [...new Set([...glyphs])].join("");
}
