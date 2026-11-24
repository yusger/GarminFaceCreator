import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { project, layer } from "../frontend/src/domain.ts";
import { localGenerate } from "../frontend/src/localGenerator.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  publicRoot = join(root, "frontend/public"),
  source = process.env.GFC_YAWF_SOURCE,
  commit = "f9db8c2d3a1f10633c195e5516d96d45f0f61340";
if (!source)
  throw Error(
    "Set GFC_YAWF_SOURCE to the pinned source text. No upstream scripts are run.",
  );
const originals = {};
for (const [path, hash] of Object.entries({
  LICENSE: "8a5ef3424dc3bff620b648c2455edfaeef1442ff29d21b902f8df55b7a1c29dd",
  "README.md":
    "6f03576a00e69b8f609d1bb9c9071cbbebf9f3f747cc2254a55032cd70b76bfb",
  "resources-round-454x454/layout.xml":
    "1c7816e0d5dc4191493d253d437db56118e17cca04a5ba47e3e2ce2e2cfb7464",
})) {
  const bytes = await readFile(resolve(source, path));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error("Pinned upstream file mismatch: " + path);
  originals[path] = bytes;
}
const p = project("YetAnother", true);
p.id = "00000000-0000-4000-8000-000000000008";
p.appId = "0484ea1374504cc2b5a4aa7f10e758f4";
p.target = "venu445mm";
p.deviceSize = "45mm";
p.updated = 0;
let serial = 0;
function add(kind, name, props) {
  const l = {
    ...layer(kind),
    ...props,
    id: `yawf_${String(++serial).padStart(3, "0")}`,
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
  color: "#070d0b",
  fillEnabled: true,
  strokeEnabled: false,
  allowClip: true,
  aod: true,
  aodColor: "#000000",
});
add("text", "标题", {
  text: "YET ANOTHER",
  x: 110,
  y: 40,
  w: 234,
  h: 30,
  size: 16,
  garminFont: "xtiny",
  color: "#7a9985",
});
add("time", "小时", {
  timePart: "hours",
  x: 64,
  y: 96,
  w: 145,
  h: 112,
  size: 100,
  garminFont: "numberHot",
  color: "#afffa6",
  aodColor: "#697e68",
});
add("date", "日期", {
  x: 62,
  y: 220,
  w: 148,
  h: 30,
  size: 20,
  garminFont: "xtiny",
  color: "#d7e3da",
});
add("time", "分钟", {
  timePart: "minutes",
  x: 64,
  y: 267,
  w: 145,
  h: 112,
  size: 100,
  garminFont: "numberHot",
  color: "#afffa6",
  aodColor: "#697e68",
});
add("line", "分列线", {
  x: 227,
  y: 98,
  w: 1,
  h: 262,
  color: "#3c6d47",
  strokeWidth: 1,
});
add("metric", "电量", {
  source: "battery",
  label: "BAT",
  x: 245,
  y: 100,
  w: 155,
  h: 32,
  size: 22,
  garminFont: "xtiny",
  color: "#d7e3da",
  threshold: true,
  thresholdFallback: "#738077",
});
add("metric", "当日步数", {
  source: "steps",
  label: "ST",
  x: 245,
  y: 153,
  w: 155,
  h: 32,
  size: 22,
  garminFont: "xtiny",
  color: "#d7e3da",
  threshold: false,
});
add("text", "时区标签", {
  text: "UTC +00:00",
  x: 245,
  y: 204,
  w: 155,
  h: 26,
  size: 14,
  garminFont: "xtiny",
  color: "#7a9985",
});
add("time", "第二时区", {
  timeUtcOffset: 0,
  x: 245,
  y: 230,
  w: 155,
  h: 45,
  size: 32,
  garminFont: "small",
  color: "#afffa6",
  aod: false,
});
add("metric", "缓存心率", {
  source: "heartRate",
  metricDecoration: false,
  label: "HR",
  x: 245,
  y: 288,
  w: 155,
  h: 32,
  size: 22,
  garminFont: "xtiny",
  threshold: true,
  thresholdFallback: "#738077",
});
add("metric", "当日距离", {
  source: "distance",
  precision: 2,
  unit: " km",
  x: 245,
  y: 334,
  w: 155,
  h: 32,
  size: 22,
  garminFont: "xtiny",
  color: "#d7e3da",
  threshold: false,
});
add("metric", "当日总热量", {
  source: "calories",
  unit: " kcal",
  x: 137,
  y: 395,
  w: 180,
  h: 30,
  size: 20,
  garminFont: "xtiny",
  color: "#7a9985",
  threshold: false,
});
p.files = localGenerate(p).map((f) =>
  f.path === "source/App.mc"
    ? {
        ...f,
        content: f.content.replace(
          "\n",
          "\n// YetAnother Creator layout adaptation of Laverlin/Yet-Another-WatchFace @ " +
            commit +
            "; upstream MIT; Creator templates GPL-3.0-or-later. See notices.\n",
        ),
      }
    : f,
);
p.codeRevision = p.revision;
p.codeProvenance = { primary: "reference" };
await writeFile(
  join(publicRoot, "templates/yetanother.json"),
  JSON.stringify(p, null, 2) + "\n",
);
for (const [path, name] of [
  ["LICENSE", "YetAnother-LICENSE.txt"],
  ["README.md", "YetAnother-README.md"],
  ["resources-round-454x454/layout.xml", "YetAnother-layout-454.xml"],
])
  await writeFile(join(publicRoot, "reference-notices", name), originals[path]);
console.log(
  "Built YetAnother Creator adaptation",
  commit,
  p.layers.length,
  "editable layers",
);
