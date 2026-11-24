import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { project, layer } from "../frontend/src/domain.ts";
import { localGenerate } from "../frontend/src/localGenerator.ts";
import {
  iconVariants,
  iconResourcePath,
} from "../frontend/src/weatherIcons.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  publicRoot = join(root, "frontend/public"),
  source = process.env.GFC_TIMELY_SOURCE,
  commit = "d38a347a548667780a9f17b84f5f02155687a72c";
if (!source)
  throw Error(
    "Set GFC_TIMELY_SOURCE to the extracted pinned TimelyFenix archive; no upstream scripts are run.",
  );
const expected = {
  LICENSE: "3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986",
  "README.md":
    "f72c5afc84b9f8c58a5f198865959fda87258d759b691de4ae76ec6841ec237e",
};
const upstream = {};
for (const [name, hash] of Object.entries(expected)) {
  const bytes = await readFile(resolve(source, name));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error("Pinned upstream file mismatch: " + name);
  upstream[name] = bytes;
}
const p = project("TimelyFenix", true);
p.id = "00000000-0000-4000-8000-000000000005";
p.appId = "16ca8a4589744f049569ab92966f7ad5";
p.target = "venu445mm";
p.deviceSize = "45mm";
p.updated = 0;
let serial = 0;
function add(kind, name, props) {
  const l = {
    ...layer(kind),
    ...props,
    id: `timely_${String(++serial).padStart(3, "0")}`,
    name,
  };
  p.layers.push(l);
  return l;
}
add("circle", "背景", {
  x: 0,
  y: 0,
  w: 454,
  h: 454,
  color: "#06101b",
  fillEnabled: true,
  strokeEnabled: false,
  aod: true,
  aodColor: "#000000",
  allowClip: true,
});
add("text", "标题", {
  text: "TIMELY",
  x: 165,
  y: 30,
  w: 124,
  h: 28,
  size: 14,
  garminFont: "xtiny",
  color: "#7891aa",
});
add("time", "时间", {
  x: 80,
  y: 68,
  w: 294,
  h: 100,
  size: 72,
  garminFont: "numberHot",
  color: "#e8f1fa",
  aodColor: "#667585",
});
add("date", "日期", {
  x: 166,
  y: 169,
  w: 180,
  h: 32,
  size: 22,
  garminFont: "xtiny",
  color: "#c5d8e9",
});
add("metric", "电量", {
  source: "battery",
  label: "BAT",
  x: 166,
  y: 203,
  w: 180,
  h: 32,
  size: 18,
  garminFont: "xtiny",
  color: "#70c7ff",
});
add("line", "日历分隔线", {
  x: 90,
  y: 242,
  w: 274,
  h: 1,
  color: "#1b3147",
  strokeWidth: 1,
});
add("calendar", "三周日历", {
  x: 80,
  y: 252,
  w: 294,
  h: 140,
  size: 18,
  garminFont: "xtiny",
  color: "#e8f1fa",
  calendarStart: "monday",
  calendarTodayColor: "#70c7ff",
  calendarTodayText: "#06101b",
  calendarMutedColor: "#586a7f",
  calendarHeaderColor: "#7891aa",
});
const weather = add("image", "缓存天气图标", {
  x: 100,
  y: 174,
  w: 56,
  h: 56,
  color: "#70c7ff",
  libraryIcon: {
    id: "meteocons_0_1_0_monochrome_clear_day",
    recolor: true,
    strokeWidth: 2,
  },
  weatherIcon: { period: "day" },
});
const catalog = JSON.parse(
  await readFile(join(publicRoot, "icon-library/catalog.json"), "utf8"),
);
p.assets = [];
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const variant of iconVariants(weather)) {
    const icon = catalog.icons.find((i) => i.id === variant.id);
    if (!icon) throw Error("Curated weather variant missing");
    const svg = await readFile(join(publicRoot, icon.path), "utf8");
    if (createHash("sha256").update(svg).digest("hex") !== icon.sha256)
      throw Error("Curated SVG fingerprint mismatch");
    const data = await page.evaluate(
      async ({ svg, tint }) => {
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml"),
          root = doc.documentElement;
        root.setAttribute("color", tint);
        for (const node of [root, ...root.querySelectorAll("*")])
          for (const name of ["fill", "stroke", "stop-color"]) {
            const value = node.getAttribute(name);
            if (value && /^(?:#[0-9a-f]{3,8}|currentColor)$/i.test(value))
              node.setAttribute(name, tint);
          }
        const image = new Image();
        image.src =
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(new XMLSerializer().serializeToString(doc));
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 56;
        canvas.getContext("2d").drawImage(image, 0, 0, 56, 56);
        return canvas.toDataURL("image/png");
      },
      { svg, tint: weather.color },
    );
    p.assets.push({
      id: `${weather.id}_${variant.key}`,
      path: iconResourcePath(weather, variant.key),
      data,
    });
    if (variant.key === "clear") weather.image = data;
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
          "\n// TimelyFenix Creator layout adaptation of KWottrich/TimelyFenix @ " +
            commit +
            "; GPL-3.0-only. See distributed notices.\n",
        ),
      }
    : f,
);
p.codeRevision = 0;
p.codeProvenance = { primary: "reference" };
await writeFile(
  join(publicRoot, "templates/timelyfenix.json"),
  JSON.stringify(p, null, 2) + "\n",
);
const out = join(publicRoot, "reference-notices");
await mkdir(out, { recursive: true });
await writeFile(join(out, "TimelyFenix-LICENSE.txt"), upstream.LICENSE);
await writeFile(join(out, "TimelyFenix-README.md"), upstream["README.md"]);
console.log(
  "Built TimelyFenix Creator adaptation",
  commit,
  p.layers.length,
  "editable layers",
  p.assets.length,
  "weather variants",
);
