// Convert a reviewed design-v1 package into an independent canonical reference.
import { readFile, writeFile, mkdir, cp, access } from "node:fs/promises";
import { resolve, dirname, relative, basename } from "node:path";
import { createHash } from "node:crypto";
import { project, layer } from "../frontend/src/domain.ts";
import { validateControls } from "../frontend/src/projectControls.ts";
const input = resolve(process.argv[2] || ""),
  read = async (p) => JSON.parse(await readFile(p, "utf8"));
if (!process.argv[2])
  throw Error(
    "Usage: node scripts/import-watchface-package.mjs PACKAGE_DIRECTORY",
  );
const pkg = await read(resolve(input, "watchface.json"));
if (
  pkg.format !== "gfc-watchface-package" ||
  pkg.formatVersion !== 1 ||
  !/^[-a-z0-9]+$/.test(pkg.id) ||
  pkg.origin.kind !== "self" ||
  pkg.canvas.width !== 454 ||
  pkg.canvas.height !== 454 ||
  pkg.referenceTarget.deviceId !== "venu445mm"
)
  throw Error(
    "First converter requires a reviewed self-authored 454px Venu4 45mm design package",
  );
const dir = resolve("resources/default-watchfaces", pkg.id);
try {
  await access(dir);
  throw Error(
    "Destination already exists; update canonical project explicitly",
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const hash = (b) => createHash("sha256").update(b).digest("hex"),
  put = async (p, b) => {
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, b);
  };
const safe = (p) => {
  if (
    typeof p !== "string" ||
    p.includes("\\") ||
    p.includes(":") ||
    p.startsWith("/") ||
    p.split("/").some((s) => !s || s === "." || s === "..")
  )
    throw Error("Unsafe package path");
  return resolve(input, p);
};
const resources = new Map(pkg.resources.map((r) => [r.id, r])),
  id = (s) => pkg.id + "_" + s.replaceAll("-", "_");
const settings = await read(safe(pkg.settingsFile)),
  p = project(pkg.name, true);
p.id =
  pkg.id === "sonar"
    ? "00000000-0000-4000-8000-000000000012"
    : crypto.randomUUID();
p.appId = hash(Buffer.from("GarminFaceCreator:" + pkg.id)).slice(0, 32);
p.backgroundColor = pkg.canvas.background;
p.updated = 0;
p.revision = 0;
p.codeRevision = 0;
p.target = "venu445mm";
p.deviceSize = "45mm";
p.versions = [];
p.layers = [];
const ref = {
  format: 1,
  slug: pkg.id,
  version: pkg.version,
  authorship: "self",
  generation: { mode: "deterministic" },
  identity: { id: p.id, name: p.name, appId: p.appId },
  attribution: {
    id: p.id,
    name: p.name,
    template: pkg.id,
    source:
      "https://github.com/yusger/GarminFaceCreator/tree/main/resources/default-watchfaces/" +
      pkg.id,
    status:
      "Self-authored design; generated native implementation GPL-3.0-or-later; supplied artwork/font notices retained separately",
    summary:
      "自主声呐混合表盘；独立数据控件、连续进度条、可配置颜色与数据来源；首版静态扫描扇区",
    upstreamCommit: null,
    upstreamCommitStatus:
      "Self-authored design package with retained source, notices and fingerprints",
    legacy: false,
    verifiedLicense: false,
  },
  images: [],
  binaryAssets: [],
  notices: [],
  fonts: [],
  codeFiles: [],
};
const fontDefs = new Map();
for (const r of pkg.resources) {
  const bytes = await readFile(safe(r.file));
  await put(resolve(dir, r.file), bytes);
  if (r.type === "font") {
    const filename = pkg.id + "-" + r.id + ".ttf";
    fontDefs.set(r.id, { id: id(r.id), family: r.family, file: filename });
    ref.fonts.push({
      file: r.file,
      publishName: filename,
      sha256: hash(bytes),
    });
    const license = await readFile(safe(r.noticeFile));
    await put(resolve(dir, r.noticeFile), license);
    ref.fonts.push({
      file: r.noticeFile,
      publishName: filename.replace(".ttf", "-LICENSE.txt"),
      sha256: hash(license),
    });
  }
}
const ruleTargets = new Map();
for (const group of pkg.thresholds)
  group.bands.forEach((b, i) =>
    ruleTargets.set(b.id, { group: group.id, index: i }),
  );
for (const raw of [...pkg.layers].sort((a, b) => a.zIndex - b.zIndex)) {
  if (
    ![
      "image",
      "text",
      "time",
      "date",
      "metric",
      "hand",
      "meter",
      "circle",
      "rect",
      "line",
    ].includes(raw.type)
  )
    throw Error("Unsupported layer type " + raw.type);
  const l = {
    ...layer(raw.type),
    id: id(raw.id),
    name: raw.name,
    color: raw.style.color || raw.style.fill || "#DCE9F0",
    x: raw.bounds?.x || 0,
    y: raw.bounds?.y || 0,
    w: raw.bounds?.width || 1,
    h: raw.bounds?.height || 1,
    size: raw.style.fontSize || 28,
    rotation: raw.rotation || 0,
    hidden: false,
    locked: false,
    activeVisible: raw.visible,
    aod: raw.aod.visible,
    aodColor: raw.aod.color || "#5E7C93",
    aodSize: raw.aod.fontSize || raw.style.fontSize || 28,
    opacity: raw.style.opacity ?? 1,
    threshold: false,
    metricDecoration: false,
    allowClip: raw.safeArea === "decoration",
    textAlign: raw.style.align || "center",
    fontWeight: 400,
  };
  if (raw.style.font) l.customFont = fontDefs.get(raw.style.font);
  if (raw.type === "image") {
    l.imageFullColor = true;
    l.assetId = id(raw.resourceId);
    const r = resources.get(raw.resourceId);
    const bytes = await readFile(safe(r.file));
    const file = "assets/" + l.assetId + ".png";
    await put(resolve(dir, file), bytes);
    ref.images.push({
      layerId: l.id,
      file,
      sha256: hash(bytes),
      mime: "image/png",
    });
  }
  if (raw.type === "text") {
    l.text = raw.text || "";
    if (raw.textFrom) l.sourceLabelFor = id(raw.textFrom.layerId);
  }
  if (raw.type === "time")
    l.timePart = { "HH:mm": "full", HH: "hours", mm: "minutes", ss: "seconds" }[
      raw.format
    ];
  if (raw.type === "date") {
    l.dateLocale = "en";
    l.dateFormat = raw.format === "ddd DD" ? "weekdayDay" : "monthDayWeek";
  }
  if (raw.type === "metric" || raw.type === "meter") {
    l.source = raw.binding.source;
    if (raw.type === "metric") {
      l.sourceLocked = raw.binding.configurable === false;
      if (l.sourceLocked) l.fixedSource = l.source;
      l.label = "";
      l.unit =
        raw.format.unitMode === "none"
          ? ""
          : raw.format.unitMode === "custom"
            ? raw.format.unit
            : undefined;
      l.autoPrecision = raw.format.precision === "auto";
      l.precision = l.autoPrecision ? undefined : raw.format.precision;
      l.groupThousands = raw.format.groupThousands;
      l.missingValue = raw.format.missing;
    }
    if (raw.thresholdGroup) {
      l.threshold = true;
      const g = pkg.thresholds.find((g) => g.id === raw.thresholdGroup);
      l.thresholdRules = g.bands.map((b) => ({
        ...(b.min === null ? {} : { min: b.min }),
        ...(b.max === null ? {} : { max: b.max }),
        color: b.color,
      }));
      l.thresholdFallback = g.fallbackColor;
    }
  }
  if (raw.type === "meter") {
    if (raw.shape !== "bar" || raw.segments !== 1 || raw.gap !== 0)
      throw Error("First converter supports continuous bar only");
    l.meterContinuous = true;
    l.meterShape = "bar";
    l.meterCount = 1;
    l.meterGoal = raw.goal;
    l.meterDimColor = raw.style.dimColor;
  }
  if (raw.type === "hand") {
    const reach = Math.max(raw.length, raw.tailLength),
      radius = reach + raw.style.width / 2;
    l.x = raw.pivot.x - radius;
    l.y = raw.pivot.y - radius;
    l.w = radius * 2;
    l.h = radius * 2;
    l.handPivotX = 0.5;
    l.handPivotY = 0.5;
    l.handType = raw.part;
    l.handReach = raw.length / reach;
    l.handTail = raw.tailLength / reach;
    l.strokeWidth = raw.style.width;
    l.handCap = raw.style.cap;
  }
  if (raw.type === "circle" || raw.type === "rect") {
    l.fillEnabled = !!raw.style.fill;
    l.strokeEnabled = !!raw.style.stroke;
    l.strokeColor = raw.style.stroke;
    l.strokeWidth = raw.style.strokeWidth;
    l.cornerRadius = raw.style.cornerRadius;
  }
  p.layers.push(l);
}
p.controls = settings.items.map((c) => {
  if (!["color", "boolean", "dataSource"].includes(c.type))
    throw Error("Unsupported setting " + c.type);
  return {
    ...c,
    targets: c.targets.flatMap((t) => {
      if (t.scope === "layer")
        return [
          {
            layerId: id(t.id),
            property: {
              "style.color": "color",
              visible: "activeVisible",
              "binding.source": "source",
            }[t.property],
          },
        ];
      if (t.scope === "thresholdBand") {
        const match = ruleTargets.get(t.id);
        return pkg.layers
          .filter((l) => l.thresholdGroup === match.group)
          .map((l) => ({
            layerId: id(l.id),
            property: "thresholdRules." + match.index + ".color",
          }));
      }
      throw Error("Unsupported setting target");
    }),
    hideWhenChangedFromDefault: c.hideWhenChangedFromDefault?.map(id),
  };
});
validateControls(p);
for (const notice of new Set([
  pkg.origin.noticeFile,
  ...pkg.resources.map((r) => r.noticeFile),
])) {
  await put(resolve(dir, notice), await readFile(safe(notice)));
  ref.notices.push({
    file: notice,
    publishName: pkg.name + "-" + basename(notice),
  });
}
await put(
  resolve(dir, "notices/repository-LICENSE.txt"),
  await readFile("LICENSE"),
);
ref.notices.push({
  file: "notices/repository-LICENSE.txt",
  publishName: "repository-LICENSE.txt",
});
await cp(input, resolve(dir, "handoff"), { recursive: true });
await put(
  resolve(dir, "conversion-report.json"),
  JSON.stringify(
    {
      format: 1,
      packageVersion: pkg.version,
      sourceSha256: hash(await readFile(resolve(input, "watchface.json"))),
      layerMapping: Object.fromEntries(pkg.layers.map((l) => [l.id, id(l.id)])),
      effects: pkg.effects.map((e) => {
        if (e.required) throw Error("Required effects need a native adapter");
        return { id: e.id, status: "static-fallback", angle: e.fallback.angle };
      }),
      settings:
        "Editor controls and Connect IQ app settings; no on-watch menu delegate",
      notes: [
        "Images remain independent layers",
        "Generic font atlases regenerated per target",
        "Continuous bar, source labels, independent active/AOD visibility retained",
      ],
    },
    null,
    2,
  ) + "\n",
);
await put(resolve(dir, "design.json"), JSON.stringify(p, null, 2) + "\n");
await put(resolve(dir, "reference.json"), JSON.stringify(ref, null, 2) + "\n");
await put(
  resolve(dir, "README.md"),
  "# " +
    pkg.name +
    "\n\nCanonical design: design.json; reviewed original package: handoff/. Source mapping and declared static scan fallback: conversion-report.json.\n\nRun node scripts/generate-reference-fonts.mjs " +
    pkg.id +
    " after changing default fonts or sizes; npm run build packages the reference. The editable copy exposes watchface controls and exports native app settings. No signing keys or PRGs are stored here.\n",
);
console.log(
  "Converted",
  pkg.name,
  p.layers.length,
  "layers",
  p.controls.length,
  "controls",
);
