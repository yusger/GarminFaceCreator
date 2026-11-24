import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { project, layer } from "../frontend/src/domain.ts";
import { localGenerate } from "../frontend/src/localGenerator.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const commit = "bcc340484bd2a3a09f13b22a2d0d6dae3b4de9c7";
const source = process.env.GFC_CRYSTAL_SOURCE;
if (!source)
  throw Error(
    "Set GFC_CRYSTAL_SOURCE to the extracted pinned Crystal archive (no upstream scripts are run).",
  );
const expected = {
  "LICENSE.txt":
    "3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986",
  "README.md":
    "1a27089a72da59f704b20ffdc6fc57b8b15469b7f9ed11331ccd742dbe56df09",
  "resources-round-454x454/layouts/layout.xml":
    "7ffa050d8724dc96aa560be6b65fe8e651d936e971371dde5a039e0e0df7ad30",
};
const upstream = Object.fromEntries(
  await Promise.all(
    Object.entries(expected).map(async ([path, hash]) => {
      const bytes = await readFile(resolve(source, path));
      if (createHash("sha256").update(bytes).digest("hex") !== hash)
        throw Error("Pinned upstream file mismatch: " + path);
      return [path, bytes];
    }),
  ),
);
const publicRoot = resolve(root, "frontend/public");
const p = project("Crystal", true);
p.id = "00000000-0000-4000-8000-000000000004";
p.appId = "84c1375aac73414c8be59288312d9154";
p.target = "venu445mm";
p.deviceSize = "45mm";
p.updated = 0;
let serial = 0;
function add(kind, name, props) {
  const item = {
    ...layer(kind),
    ...props,
    id: `crystal_${String(++serial).padStart(3, "0")}`,
    name,
  };
  p.layers.push(item);
  return item;
}
add("circle", "背景", {
  x: 0,
  y: 0,
  w: 454,
  h: 454,
  color: "#000000",
  fillEnabled: true,
  strokeEnabled: false,
  allowClip: true,
  aod: true,
  aodColor: "#000000",
});
add("meter", "步数弧形目标", {
  source: "steps",
  meterShape: "left",
  meterGoal: 10000,
  meterCount: 20,
  meterDim: 0.3,
  x: 2,
  y: 67,
  w: 88,
  h: 320,
  color: "#e8eff7",
  allowClip: true,
});
add("meter", "电量弧形目标", {
  source: "battery",
  meterShape: "right",
  meterGoal: 100,
  meterCount: 20,
  meterDim: 0.3,
  x: 364,
  y: 67,
  w: 88,
  h: 320,
  color: "#70c7ff",
  allowClip: true,
});
add("text", "标题", {
  garminFont: "tiny",
  text: "CRYSTAL",
  x: 155,
  y: 40,
  w: 144,
  h: 24,
  size: 14,
  color: "#6d8196",
});
add("metric", "电量", {
  garminFont: "tiny",
  source: "battery",
  x: 163,
  y: 77,
  w: 128,
  h: 34,
  size: 24,
  color: "#c4d3e2",
});
add("date", "日期", {
  garminFont: "small",
  x: 118,
  y: 124,
  w: 218,
  h: 38,
  size: 26,
  color: "#c4d3e2",
});
add("time", "小时", {
  timePart: "hours",
  x: 86,
  y: 166,
  w: 135,
  h: 124,
  size: 110,
  color: "#f1f5fa",
  fontWeight: 700,
  garminFont: "numberHot",
  aodSize: 72,
  aodColor: "#626a73",
});
add("text", "时间分隔", {
  text: ":",
  x: 216,
  y: 166,
  w: 24,
  h: 124,
  size: 76,
  color: "#7891aa",
  garminFont: "numberHot",
  aod: true,
  aodColor: "#626a73",
});
add("time", "分钟", {
  timePart: "minutes",
  x: 233,
  y: 166,
  w: 135,
  h: 124,
  size: 110,
  color: "#70c7ff",
  fontWeight: 400,
  garminFont: "numberHot",
  aodSize: 72,
  aodColor: "#626a73",
});
add("metric", "实时秒数", {
  garminFont: "tiny",
  source: "seconds",
  x: 318,
  y: 280,
  w: 48,
  h: 28,
  size: 18,
  color: "#7891aa",
  threshold: false,
});
add("metric", "当日距离", {
  garminFont: "small",
  source: "distance",
  x: 124,
  y: 301,
  w: 206,
  h: 32,
  size: 24,
  unit: " km",
  precision: 2,
  color: "#a9c2d9",
  threshold: false,
});
add("metric", "当日步数", {
  garminFont: "tiny",
  source: "steps",
  x: 143,
  y: 339,
  w: 180,
  h: 32,
  size: 24,
  textAlign: "left",
  color: "#f1f5fa",
  threshold: false,
});
add("metric", "当日总热量", {
  garminFont: "tiny",
  source: "calories",
  x: 143,
  y: 375,
  w: 185,
  h: 32,
  size: 24,
  textAlign: "left",
  unit: " kcal",
  color: "#a9c2d9",
  threshold: false,
});
const catalog = JSON.parse(
  await readFile(join(publicRoot, "icon-library/catalog.json"), "utf8"),
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const [slug, name, x, y, tint] of [
    ["battery_full", "电量图标", 124, 80, "#c4d3e2"],
    ["footprints", "步数图标", 108, 342, "#f1f5fa"],
    ["flame", "热量图标", 108, 378, "#a9c2d9"],
  ]) {
    const icon = catalog.icons.find((i) => i.id === `lucide_586bf5cf_${slug}`);
    if (!icon) throw Error("Missing licensed icon");
    const item = add("image", name, {
      x,
      y,
      w: 24,
      h: 24,
      color: tint,
      assetId: `crystal_icon_${slug}`,
      libraryIcon: { id: icon.id, recolor: true, strokeWidth: 1.8 },
    });
    const svg = await readFile(join(publicRoot, icon.path), "utf8");
    item.image = await page.evaluate(
      async ({ svg, tint }) => {
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
        doc.documentElement.setAttribute("color", tint);
        doc.documentElement.setAttribute("stroke-width", "1.8");
        const data =
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(new XMLSerializer().serializeToString(doc));
        const img = new Image();
        img.src = data;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 24;
        canvas.getContext("2d").drawImage(img, 0, 0, 24, 24);
        return canvas.toDataURL("image/png");
      },
      { svg, tint },
    );
  }
} finally {
  await browser.close();
}
p.files = localGenerate(p).map((f) =>
  f.path === "source/App.mc"
    ? {
        ...f,
        content: f.content.replace(
          "\n",
          "\n// Crystal Creator adaptation of warmsound/crystal-face @ " +
            commit +
            "; layout adaptation GPL-3.0-only. See distributed Crystal notices.\n",
        ),
      }
    : f,
);
p.codeRevision = p.revision;
p.codeProvenance = { primary: "reference" };
await writeFile(
  join(publicRoot, "templates/crystal.json"),
  JSON.stringify(p, null, 2) + "\n",
);
const notices = join(publicRoot, "reference-notices");
await mkdir(notices, { recursive: true });
for (const [original, name] of [
  ["LICENSE.txt", "Crystal-LICENSE.txt"],
  ["README.md", "Crystal-README.md"],
  ["resources-round-454x454/layouts/layout.xml", "Crystal-layout-454.xml"],
])
  await writeFile(join(notices, name), upstream[original]);
console.log(
  "Built Crystal Creator adaptation",
  commit,
  p.layers.length,
  "editable layers",
);
