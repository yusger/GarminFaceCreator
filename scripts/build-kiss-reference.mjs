import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { project, layer } from "../frontend/src/domain.ts";
import { localGenerate } from "../frontend/src/localGenerator.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  publicRoot = join(root, "frontend/public"),
  source = process.env.GFC_KISS_SOURCE;
const commit = "35617422cfc6e8db0c703b247c54835c3d77008c";
if (!source)
  throw Error(
    "Set GFC_KISS_SOURCE to the pinned KISSFace source text. No upstream scripts are run.",
  );
const originals = {};
for (const [path, hash] of Object.entries({
  LICENSE: "1ebb58a45898a2fb3240cb93942c4ec815860abfc250fd3b5af7e2f35b6ad6e2",
  "README.md":
    "1c2d63bd0b04af2ee6bd643d89f4bcd729a6e6f342fd59f6c17866a9606863eb",
})) {
  const bytes = await readFile(resolve(source, path));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error("Pinned upstream file mismatch: " + path);
  originals[path] = bytes;
}
const p = project("KISSFace", true);
p.id = "00000000-0000-4000-8000-000000000007";
p.appId = "b5edf5a1b425450a85c794cd0aed1537";
p.target = "venu445mm";
p.deviceSize = "45mm";
p.updated = 0;
let serial = 0;
function add(kind, name, props) {
  const item = {
    ...layer(kind),
    ...props,
    id: `kiss_${String(++serial).padStart(3, "0")}`,
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
  color: "#080e16",
  fillEnabled: true,
  strokeEnabled: false,
  allowClip: true,
  aod: true,
  aodColor: "#000000",
});
add("text", "标题", {
  text: "KISS FACE",
  x: 150,
  y: 39,
  w: 154,
  h: 26,
  size: 16,
  garminFont: "xtiny",
  color: "#64758a",
});
add("metric", "电量", {
  source: "battery",
  x: 172,
  y: 84,
  w: 130,
  h: 34,
  size: 20,
  garminFont: "xtiny",
  color: "#cde8f8",
  threshold: true,
  thresholdRules: [
    { max: 10, color: "#ff5566" },
    { min: 10, max: 30, color: "#ffee44" },
    { min: 30, color: "#cde8f8" },
  ],
  thresholdFallback: "#718194",
});
for (const [i, timePart] of [
  "hourTens",
  "hourOnes",
  "minuteTens",
  "minuteOnes",
].entries())
  add("time", ["时十位", "时个位", "分十位", "分个位"][i], {
    timePart,
    x: [72, 143, 240, 311][i],
    y: 137,
    w: 71,
    h: 108,
    size: 94,
    garminFont: "numberHot",
    color: ["#ffaa00", "#55dd99", "#65bdff", "#ff6688"][i],
    aod: true,
    aodColor: "#65707c",
  });
add("text", "时间分隔", {
  text: ":",
  x: 215,
  y: 137,
  w: 25,
  h: 108,
  size: 68,
  garminFont: "numberHot",
  color: "#748497",
  aod: true,
  aodColor: "#4b5561",
});
add("metric", "缓存心率", {
  source: "heartRate",
  metricDecoration: false,
  x: 207,
  y: 258,
  w: 75,
  h: 35,
  size: 24,
  garminFont: "small",
  threshold: true,
  thresholdFallback: "#718194",
});
add("date", "日期", {
  x: 140,
  y: 300,
  w: 174,
  h: 30,
  size: 20,
  garminFont: "xtiny",
  color: "#9aaec2",
});
add("metric", "当日步数", {
  source: "steps",
  label: "STEPS",
  x: 87,
  y: 344,
  w: 280,
  h: 28,
  size: 18,
  garminFont: "xtiny",
  color: "#65bdff",
  threshold: false,
});
add("meter", "步数目标条", {
  source: "steps",
  meterShape: "bar",
  meterGoal: 10000,
  meterCount: 20,
  meterDim: 0.3,
  x: 102,
  y: 380,
  w: 250,
  h: 12,
  color: "#65bdff",
});
add("meter", "电量目标条", {
  source: "battery",
  meterShape: "bar",
  meterGoal: 100,
  meterCount: 20,
  meterDim: 0.3,
  x: 138,
  y: 122,
  w: 178,
  h: 8,
  color: "#cde8f8",
  threshold: true,
  thresholdRules: [
    { max: 10, color: "#ff5566" },
    { min: 10, max: 30, color: "#ffee44" },
    { min: 30, color: "#cde8f8" },
  ],
  thresholdFallback: "#718194",
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
    ["heart_pulse", "心率图标", 173, 265, "#ff6677"],
    ["battery_full", "电量图标", 138, 89, "#9aabbc"],
  ]) {
    const icon = catalog.icons.find((i) => i.id === `lucide_586bf5cf_${slug}`);
    if (!icon) throw Error("Missing licensed icon");
    const item = add("image", name, {
      x,
      y,
      w: 24,
      h: 24,
      color: tint,
      assetId: `kiss_icon_${slug}`,
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
          "\n// KISSFace Creator layout adaptation of dbcm/KISSFace @ " +
            commit +
            "; original MIT; Creator templates GPL-3.0-or-later. See notices.\n",
        ),
      }
    : f,
);
p.codeRevision = p.revision;
p.codeProvenance = { primary: "reference" };
await writeFile(
  join(publicRoot, "templates/kissface.json"),
  JSON.stringify(p, null, 2) + "\n",
);
for (const [path, name] of [
  ["LICENSE", "KISSFace-LICENSE.txt"],
  ["README.md", "KISSFace-README.md"],
])
  await writeFile(join(publicRoot, "reference-notices", name), originals[path]);
console.log(
  "Built KISSFace Creator adaptation",
  commit,
  p.layers.length,
  "editable layers",
);
