import type { Project, Layer, CodeFile } from "./domain.ts";
import {
  controlValue,
  resolvedLayer,
  sourceLabels,
} from "./projectControls.ts";
const key = (id: string) => "Gfc_" + id.replaceAll("-", "_");
const variable = (id: string) => "cfg_" + id.replaceAll("-", "_");
const hex = (v: string) => "0x" + v.slice(1);
const xml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function nativeControlledDraw(
  p: Project,
  l: Layer,
  aod: boolean,
  draw: (l: Layer) => string,
) {
  const controls = p.controls || [],
    sourceLayer = l.sourceLabelFor || l.id,
    source = controls.find(
      (c) =>
        c.type === "dataSource" &&
        c.targets.some(
          (t) => t.layerId === sourceLayer && t.property === "source",
        ),
    );
  const make = (input: Layer) => {
    const copy = {
        ...input,
        thresholdRules: input.thresholdRules?.map((r) => ({ ...r })),
      },
      replacements: Array<[string, string]> = [];
    if (!aod)
      for (const [index, c] of controls.entries())
        if (c.type === "color")
          for (const t of c.targets.filter((t) => t.layerId === l.id)) {
            const sentinel = "#" + (0xe00000 + index).toString(16);
            if (t.property === "color") copy.color = sentinel;
            else {
              const rule =
                copy.thresholdRules?.[Number(t.property.split(".")[1])];
              if (rule) rule.color = sentinel;
            }
            replacements.push([hex(sentinel), variable(c.id)]);
          }
    let code = draw(resolvedLayer(copy, p.layers));
    for (const [token, value] of replacements)
      code = code.replaceAll(token, value);
    return code;
  };
  let code = source
    ? source
        .options!.map(
          (value, i) =>
            `${i ? "else " : ""}if(${variable(source.id)}.equals(${JSON.stringify(value)})){${make({ ...l, ...(l.sourceLabelFor ? { text: sourceLabels[value], sourceLabelFor: undefined } : { source: value }) })}}`,
        )
        .join("")
    : make(l);
  if (!aod) {
    const conditions = [];
    const bool = controls.find(
      (c) =>
        c.type === "boolean" &&
        c.targets.some(
          (t) => t.layerId === l.id && t.property === "activeVisible",
        ),
    );
    if (bool) {
      code = source ? code : make({ ...l, activeVisible: true });
      conditions.push(variable(bool.id));
    }
    for (const c of controls)
      if (c.hideWhenChangedFromDefault?.includes(l.id))
        conditions.push(
          `${variable(c.id)}.equals(${JSON.stringify(c.default)})`,
        );
    if (conditions.length) code = `if(${conditions.join(" && ")}){${code}}`;
  }
  return code;
}
export function nativeControls(p: Project) {
  const controls = p.controls || [],
    palette = [
      "#FFFFFF",
      "#DCE9F0",
      "#4FD1C5",
      "#F2A65F",
      "#FF6B6B",
      "#55AAFF",
      "#B77CFF",
      "#FF77BB",
      "#E9FF5C",
    ];
  const properties = [],
    settings = [],
    strings = [];
  for (const c of controls) {
    const id = key(c.id),
      v = controlValue(p, c),
      def = c.type === "color" ? hex(String(v)) : String(v),
      type =
        c.type === "color"
          ? "number"
          : c.type === "boolean"
            ? "boolean"
            : "string";
    properties.push(
      `<property id="${id}" type="${type}">${xml(def)}</property>`,
    );
    strings.push(`<string id="${id}">${xml(c.label)}</string>`);
    const entries =
      c.type === "color"
        ? [...new Set([String(v), ...palette])]
        : c.options || [];
    const config =
      c.type === "boolean"
        ? '<settingConfig type="boolean"/>'
        : `<settingConfig type="list">${entries
            .map((entry, i) => {
              const label = id + "_" + i;
              strings.push(
                `<string id="${label}">${xml(c.type === "dataSource" ? { steps: "步数", calories: "当日总热量", distance: "当日距离", battery: "电量", heartRate: "心率", temperature: "天气温度", seconds: "秒数" }[entry] || entry : entry)}</string>`,
              );
              return `<listEntry value="${xml(c.type === "color" ? hex(entry) : entry)}">@Strings.${label}</listEntry>`;
            })
            .join("")}</settingConfig>`;
    settings.push(
      `<setting propertyKey="@Properties.${id}" title="@Strings.${id}">${config}</setting>`,
    );
  }
  const reads = controls
    .map((c) => {
      const id = key(c.id),
        v = controlValue(p, c),
        fallback = c.type === "color" ? hex(String(v)) : JSON.stringify(v),
        valid =
          c.type === "color"
            ? "v instanceof Toybox.Lang.Number && v>=0 && v<=16777215"
            : c.type === "boolean"
              ? "v instanceof Toybox.Lang.Boolean"
              : `v instanceof Toybox.Lang.String && (${c.options!.map((x) => `v.equals(${JSON.stringify(x)})`).join(" || ")})`;
      return `{var v=null;try{v=Application.Properties.getValue(${JSON.stringify(id)});}catch(e){}settingsCache[${JSON.stringify(id)}]=(v!=null && (${valid}))?v:${fallback};}`;
    })
    .join("");
  return {
    files: controls.length
      ? ([
          {
            path: "resources/settings/properties.xml",
            content: "<properties>" + properties.join("") + "</properties>",
          },
          {
            path: "resources/settings/settings.xml",
            content: "<settings>" + settings.join("") + "</settings>",
          },
          {
            path: "resources/settings/strings.xml",
            content: "<strings>" + strings.join("") + "</strings>",
          },
        ] satisfies CodeFile[])
      : [],
    helpers: controls.length
      ? `var settingsCache=null;function prepareSettings(){if(settingsCache==null){settingsCache={};${reads}}}`
      : "",
    frame: controls.length
      ? "prepareSettings();" +
        controls
          .map(
            (c) =>
              `var ${variable(c.id)}=settingsCache[${JSON.stringify(key(c.id))}];`,
          )
          .join("")
      : "",
  };
}
