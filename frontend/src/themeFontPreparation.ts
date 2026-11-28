import { rasterBaselineShift } from "./rasterBaseline";
import type { Project, Layer } from "./domain";
import { migrateProject } from "./migrations";
import { validateProject } from "./domain";
import { rasterizeProjectFont } from "./rasterizeFont";
import { bitmapLayerPatch } from "./bitmapFontLayout";
import { bitmapFontDiagnostics, bitmapFontInfo } from "./bitmapFonts";
import { requiredFontGlyphs } from "./fontGlyphs";
import { enableDevices, projectForDevice, deviceKey } from "./multiDevice";
// Reference-package preparation only. Fresh shared definitions; never overwrites existing device overrides.
export async function prepareThemeFontResources(
  input: Project,
): Promise<Project> {
  if (
    !input.themes ||
    input.multiDevice ||
    input.bitmapFonts?.length ||
    input.target !== "venu445mm"
  )
    throw Error(
      "主题字体准备需要全新Venu4 45mm共享定义，不能覆盖已有设备或位图字体",
    );
  const original = structuredClone(migrateProject(input)),
    variants = [];
  let assets: NonNullable<Project["bitmapFonts"]> = [];
  let master: Layer[] = [];
  let fontRoles: Project["fontRoles"];
  for (const target of ["venu445mm", "venu441mm"]) {
    const scale = (target === "venu445mm" ? 454 : 390) / 454;
    let p: Project = {
      ...structuredClone(original),
      target,
      deviceSize: target === "venu445mm" ? "45mm" : "41mm",
      fontRoles: undefined,
      bitmapFonts: assets,
    };
    p.layers = p.layers.map((l) =>
      l.activeVisible === false && l.aod && l.customFont
        ? { ...l, size: l.aodSize || l.size }
        : l,
    );
    const groups = new Map<
      string,
      { font: string; pixels: number; layers: Layer[] }
    >();
    for (const l of p.layers.filter(
      (l) => l.customFont && l.exportIncluded !== false,
    )) {
      if (
        l.locked ||
        l.widgetOrigin ||
        !["text", "time", "date", "metric"].includes(l.kind)
      )
        throw Error("主题精确字体仅支持未锁定的独立文字");
      const pixels = Math.round(l.size * scale);
      if (l.aod && Math.round((l.aodSize || l.size) * scale) !== pixels)
        throw Error("不同息屏字号必须提供独立息屏图层");
      const key = l.customFont!.id + ":" + pixels,
        g = groups.get(key) || { font: l.customFont!.id, pixels, layers: [] };
      g.layers.push(l);
      groups.set(key, g);
    }
    if (groups.size > 16)
      throw Error("每目标最多16组字体；请合并字体和物理字号");
    for (const g of groups.values()) {
      const glyphs = [
        ...new Set(g.layers.flatMap((l) => [...requiredFontGlyphs(p, l)])),
      ].join("");
      const asset = await rasterizeProjectFont(
        p,
        g.layers[0],
        g.font,
        g.pixels,
        glyphs,
      );
      assets = [...assets.filter((f) => f.id !== asset.id), asset];
      p = { ...p, bitmapFonts: assets };
      const shift = await rasterBaselineShift(p, g.layers[0], asset.id);
      const ids = new Set(g.layers.map((l) => l.id));
      p.layers = p.layers.map((l) =>
        ids.has(l.id)
          ? {
              ...l,
              ...bitmapLayerPatch(p, asset.id),
              bitmapBaselineShift: shift,
            }
          : l,
      );
    }
    const issues = bitmapFontDiagnostics(p);
    if (issues.length) throw Error(issues.map((d) => d.message).join("; "));
    if (target === "venu445mm") {
      master = p.layers;
      fontRoles = [];
      for (const role of original.fontRoles || []) {
        const byFont = new Map<string, string[]>();
        for (const id of role.layerIds) {
          const l = p.layers.find((l) => l.id === id);
          if (!l?.bitmapFontId) throw Error("字体角色包含未转换成员");
          byFont.set(l.bitmapFontId, [
            ...(byFont.get(l.bitmapFontId) || []),
            id,
          ]);
        }
        for (const [fontId, layerIds] of byFont) {
          const font = assets.find((f) => f.id === fontId)!;
          const pixels = bitmapFontInfo(font).size;
          fontRoles.push({
            ...role,
            id: role.id + "-" + pixels,
            name: role.name + " · " + pixels + "px",
            fontId,
            layerIds,
          });
        }
      }
      if (fontRoles.length > 32) throw Error("拆分后的字体角色超过32项");
    }
    const overrides: Record<string, any> = {};
    if (target !== "venu445mm")
      for (const l of p.layers.filter((l) => l.bitmapFontId))
        overrides[l.id] = {
          customFont: null,
          garminFont: "auto",
          bitmapFontId: l.bitmapFontId,
          fontWeight: l.fontWeight,
          size: l.size,
          aodSize: l.aodSize,
          bitmapTracking: l.bitmapTracking ?? 0,
          bitmapTabular: l.bitmapTabular ?? false,
          bitmapBaselineShift: l.bitmapBaselineShift ?? 0,
          bitmapLineHeight: l.bitmapLineHeight ?? 0,
        };
    variants.push({
      key: target + ":" + p.deviceSize,
      target,
      deviceSize: p.deviceSize!,
      overrides,
      revision: 0,
      code: { files: [], versions: [], codeRevision: -1 },
    });
  }
  const base = enableDevices({
    ...original,
    layers: master,
    fontRoles,
    bitmapFonts: assets,
    files: [],
    versions: [],
    revision: 0,
    codeRevision: -1,
  });
  const out: Project = {
    ...base,
    multiDevice: {
      ...base.multiDevice!,
      master: structuredClone(master),
      scope: "master",
      variants,
    },
  };
  for (const variant of variants) {
    const issues = bitmapFontDiagnostics(
      projectForDevice(out, deviceKey(variant)),
    );
    if (issues.length) throw Error(issues.map((i) => i.message).join("; "));
  }
  validateProject(out);
  return out;
}
