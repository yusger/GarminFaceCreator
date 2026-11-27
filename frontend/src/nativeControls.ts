import {controlSettingKey,legacySettingKey,sourceCode,nativeSourceSettings} from "./nativeSettingIds.ts";
import { nativeThemeMenu } from "./nativeThemeMenu.ts";
import { themeIndex, layerThemeIndex, activeTheme,themeCode } from "./themes.ts";
import { sourceSlotLayer,sourceSlotLabel,sourceSlotThresholds } from "./dataSlots.ts";
import type { Project, Layer, CodeFile } from "./domain.ts";
import {
  controlValue,
  resolvedLayer,
  sourceLabels,
} from "./projectControls.ts";
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
  const mappedIcon=controls.some(c=>c.sourceIcons&&Object.values(c.sourceIcons).some(list=>list.includes(l.id)));
  if(mappedIcon)l={...l,...(aod?{aod:p.layers.find(x=>x.id===l.id)?.aod??l.aod}:{activeVisible:p.layers.find(x=>x.id===l.id)?.activeVisible??true})};
  const make = (input: Layer) => {
    const copy = {
        ...input,
        thresholdRules: input.thresholdRules?.map((r) => ({ ...r })),
      },
      replacements: Array<[string, string]> = [];
    const slot=p.controls?.find(c=>c.slot&&c.targets.some(t=>t.layerId===input.id));
    if (!aod)
      for (const [index, c] of controls.entries())
        if (c.type === "color")
          for (const t of c.targets.filter((t) => t.layerId === l.id)) {
            const sentinel = "#" + (0xe00000 + index).toString(16);
            if (t.property === "color") copy.color = sentinel;
            else {
              if(slot&&input.source!==slot.default)continue;
              const rule =
                copy.thresholdRules?.[Number(t.property.split(".")[1])];
              if (rule) rule.color = sentinel;
            }
            replacements.push([hex(sentinel), variable(c.id)]);
          }
    if(!aod&&slot&&input.source!==slot.default&&copy.kind==="metric"){copy.thresholdRules=sourceSlotThresholds(copy.source,copy.color);copy.threshold=copy.thresholdRules.length>0;copy.thresholdFallback=copy.color;}
    let code = draw(resolvedLayer(copy, p.layers,p.controls));
    for (const [token, value] of replacements)
      code = code.replaceAll(token, value);
    return code;
  };
  let code = source
    ? source
        .options!.map(
          (value, i) =>
            `${i ? "else " : ""}if(${variable(source.id)}.equals(${JSON.stringify(value)})){${make(l.sourceLabelFor ? { ...l, text: l.sourceLabelStyle?sourceSlotLabel(value,l.sourceLabelStyle):source.sourceLabels?.[value]||sourceLabels[value], sourceLabelFor: undefined } : source.slot ? sourceSlotLayer(p, l, source, value) : { ...l, source: value })}}`,
        )
        .join("")
    : make(l);
  const conditions: string[] = [];
  if (!aod) {
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
  }
  for (const c of controls)
    if (c.hideWhenChangedFromDefault?.includes(l.id))
      conditions.push(`${variable(c.id)}.equals(${JSON.stringify(c.default)})`);
  for(const c of controls)if(c.sourceIcons){const sources=Object.entries(c.sourceIcons).filter(([,list])=>list.includes(l.id)).map(([source])=>source);if(sources.length)conditions.push("("+sources.map(s=>`${variable(c.id)}.equals(${JSON.stringify(s)})`).join(" || ")+")");}
  const theme = layerThemeIndex(p, l.id);
  if (theme >= 0) conditions.push(`cfgTheme==${theme}`);
  if (conditions.length) code = `if(${conditions.join(" && ")}){${code}}`;
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
  const hasSettings = !!p.themes || controls.length > 0;
  const properties = [],
    settings = [],
    strings = [];
  for (const c of controls) {
    const id = controlSettingKey(c),
      v = controlValue(p, c),
      def =
        c.type === "color"
          ? hex(String(v))
          : c.type === "dataSource"
            ? "-1"
            : String(v),
      type = c.type === "boolean" ? "boolean" : "number";
    if(c.type==="dataSource")properties.push(`<property id="${legacySettingKey(c.id)}" type="number">-1</property>`);
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
              return `<listEntry value="${xml(c.type === "color" ? hex(entry) : String(sourceCode(entry)))}">@Strings.${label}</listEntry>`;
            })
            .join("")}</settingConfig>`;
    settings.push(
      `<setting propertyKey="@Properties.${id}" title="@Strings.${id}">${config}</setting>`,
    );
  }
  if (p.themes) {
    properties.push(
      `<property id="Gfc_Theme" type="number">${themeCode(activeTheme(p)!.id)}</property>`,
    );
    strings.push('<string id="Gfc_Theme">Theme</string>');
    settings.push(
      '<setting propertyKey="@Properties.Gfc_Theme" title="@Strings.Gfc_Theme"><settingConfig type="list">' +
        p.themes.presets
          .map((t, i) => {
            strings.push(`<string id="Gfc_Theme_${i}">${xml(t.name)}</string>`);
            return `<listEntry value="${themeCode(t.id)}">@Strings.Gfc_Theme_${i}</listEntry>`;
          })
          .join("") +
        "</settingConfig></setting>",
    );
  }
  const themeReads = p.themes
    ? `var idx=${p.themes.presets.findIndex((t) => t.id === p.themes!.defaultId)};try{var theme=Application.Properties.getValue("Gfc_Theme");if(theme instanceof Toybox.Lang.Number){${p.themes.presets.map((t, i) => `if(theme==${themeCode(t.id)}){idx=${i};}`).join("")}}}catch(e){}settingsCache["Gfc_Theme"]=idx;`
    : "";
  const themeFrame = p.themes
    ? 'var cfgTheme=settingsCache["Gfc_Theme"] as Toybox.Lang.Number;'
    : "";
  const reads = controls
    .map((c) => {
      const id = controlSettingKey(c),
        v = controlValue(p, c),
        fallback = c.type === "color" ? hex(String(v)) : JSON.stringify(v),
        valid =
          c.type === "color"
            ? "v instanceof Toybox.Lang.Number && v>=0 && v<=16777215"
            : c.type === "boolean"
              ? "v instanceof Toybox.Lang.Boolean"
              : `v instanceof Toybox.Lang.Number && v>=0 && v<${c.options!.length} && v.toNumber()==v`;
      if(c.type==="dataSource")return `settingsCache[${JSON.stringify(id)}]=gfcSourceSetting(${JSON.stringify(id)},${JSON.stringify(legacySettingKey(c.id))},${JSON.stringify(c.legacySourceOptions||c.options)},${JSON.stringify(c.options!.map(sourceCode))},${JSON.stringify(c.options)},${fallback});`;
      return `{var v=null;try{v=Application.Properties.getValue(${JSON.stringify(id)});}catch(e){}settingsCache[${JSON.stringify(id)}]=(v!=null && (${valid}))?v:${fallback};}`;
    })
    .join("");
  return {
    menuFiles: nativeThemeMenu(p),
    frameVariables: [
      ...(p.themes ? [{ name: "cfgTheme", type: "Toybox.Lang.Number" }] : []),
      ...controls.map((c) => ({
        name: variable(c.id),
        type:
          "Toybox.Lang." +
          (c.type === "color"
            ? "Number"
            : c.type === "boolean"
              ? "Boolean"
              : "String"),
      })),
    ],
    files: hasSettings
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
    helpers: hasSettings
      ? `${controls.some(c=>c.type==="dataSource")?nativeSourceSettings:""}var settingsCache=null;function prepareSettings(){if(settingsCache==null){settingsCache={};${reads}${themeReads}}}`
      : "",
    frame: hasSettings
      ? "prepareSettings();" +
        themeFrame +
        controls
          .map(
            (c) =>
              `var ${variable(c.id)}=settingsCache[${JSON.stringify(controlSettingKey(c))}] as Toybox.Lang.${c.type === "color" ? "Number" : c.type === "boolean" ? "Boolean" : "String"};`,
          )
          .join("")
      : "",
  };
}
