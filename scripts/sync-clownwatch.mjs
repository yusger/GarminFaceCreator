// Refresh the bundled reference from the sibling native project. Run manually
// after updating ClownWatch; deployed source does not require that sibling.
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { layer } from "../frontend/src/domain.ts";
const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(home, "../WatchFace/ClownWatch");
const files = [];
async function collect(dir) {
  for (const e of await readdir(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const name = dir + "/" + e.name;
    if (e.isDirectory()) await collect(name);
    else if (/\.(mc|xml|svg)$/.test(name) && e.name !== "ClownTests.mc") {
      let content = await readFile(path.join(root, name), "utf8");
      if (name === "resources/drawables/drawables.xml")
        content = content.replace(
          'filename="gatekeeper-portal.png"',
          'filename="../../assets/clownwatch-portal.png"',
        );
      files.push({ path: name, content });
    }
  }
}
files.push({
  path: "manifest.xml",
  content: await readFile(path.join(root, "manifest.xml"), "utf8"),
});
files.push({
  path: "monkey.jungle",
  content:
    "project.manifest = manifest.xml\nbase.sourcePath = source\nbase.resourcePath = resources\n",
});
await collect("source");
await collect("resources");
let serial = 0;
const layers = [];
const scale = 452 / 430;
const pos = (x) => 227 + (x - 227) * scale;
function add(kind, name, x, y, w, h, color, size = 20, text = "", extra = {}) {
  layers.push({
    ...layer(kind),
    id: "clown-layer-" + ++serial,
    name,
    x,
    y,
    w,
    h,
    color,
    size,
    text,
    threshold: false,
    aod: false,
    ...extra,
  });
}
function centered(
  kind,
  name,
  x,
  y,
  w,
  h,
  color,
  size = 20,
  text = "",
  extra = {},
) {
  add(
    kind,
    name,
    pos(x) - w / 2,
    pos(y) - h / 2,
    w,
    h,
    color,
    size,
    text,
    extra,
  );
}
const background = await readFile(
  path.join(root, "resources/drawables/gatekeeper-portal.png"),
);
add("image", "守门人魔法阵背景", 0, 0, 454, 454, "#000000", 20, "", {
  id: "clownwatch-portal",
  locked: true,
  image: "data:image/png;base64," + background.toString("base64"),
});
add("ring", "符文秒环刻度", 1, 1, 452, 452, "#00ddcc");
// Use the native watch face's original rune strokes in the layered web preview.
const runes = await readFile(
  path.join(root, "source/ClownRuneRing.mc"),
  "utf8",
);
const symbols = JSON.parse(
  runes.match(/var symbols = (\[[\s\S]*?\]) as Array/)[1],
);
for (let i = 0; i < 12; i++) {
  const angle = ((i * 30 + 15) * Math.PI) / 180,
    track = 226 - 13 * scale;
  for (const [x1, y1, x2, y2] of symbols[i]) {
    const x =
      227 +
      Math.sin(angle) * (track + y1 * scale) +
      Math.cos(angle) * x1 * scale;
    const y =
      227 -
      Math.cos(angle) * (track + y1 * scale) +
      Math.sin(angle) * x1 * scale;
    const dx =
      Math.sin(angle) * (y2 - y1) * scale + Math.cos(angle) * (x2 - x1) * scale;
    const dy =
      -Math.cos(angle) * (y2 - y1) * scale +
      Math.sin(angle) * (x2 - x1) * scale;
    const length = Math.hypot(dx, dy);
    const rotation =
      ((Math.atan2(dy, dx) - Math.atan2(1, length)) * 180) / Math.PI;
    const a = (rotation * Math.PI) / 180;
    const mx = x + dx / 2,
      my = y + dy / 2;
    add(
      "line",
      `符文 ${i + 1}`,
      mx - length / 2,
      my - 0.5,
      length,
      1,
      i * 30 + 15 <= 144 ? "#00ddcc" : "#21544e",
      20,
      "",
      { rotation },
    );
  }
}
for (let i = 0; i < 2; i++) {
  const x = 192 + i * 70;
  centered("rect", `十字眼睛 ${i + 1} 横`, x, 86, 53, 12, "#ffffff");
  centered("rect", `十字眼睛 ${i + 1} 竖`, x, 86, 12, 53, "#ffffff");
}
centered("circle", "小丑舌头", 227, 145, 56, 55, "#55aaff");
centered("rect", "舌头上缘", 227, 132, 56, 17, "#55aaff");
centered("rect", "嘴部横线", 227, 126, 132, 2, "#a5d6ef");
centered("rect", "舌头中线", 227, 138, 2, 25, "#e0efff");
for (const [x1, y, x2] of [
  [97, 178, 184],
  [270, 178, 357],
  [102, 281, 352],
  [160, 356, 294],
])
  centered(
    "rect",
    "数据分隔线",
    (x1 + x2) / 2,
    y,
    (x2 - x1) * scale,
    1,
    "#1d2e35",
  );
centered("time", "时间", 227, 228, 270, 108, "#ffffff", 88, "", { aod: true });
function metric(name, label, x, ly, vy, w, source, text, color = "#ffffff") {
  centered("text", name + "标签", x, ly, w, 20, "#b8b8b8", 15, label);
  centered(source ? "metric" : "text", name, x, vy, w, 32, color, 25, text, {
    source: source || "",
    threshold: ["heartRate", "battery"].includes(source),
  });
}
metric("心率", "HR", 115, 129, 153, 85, "heartRate", "", "#55ff99");
metric("步数", "STEPS", 337, 129, 153, 90, "steps", "");
metric("热量", "CAL", 68, 214, 240, 62, "calories", "");
metric("血氧", "SPO2", 386, 214, 240, 63, "", "98%");
metric("海拔", "ALT", 120, 299, 328, 93, "", "1,286");
centered("date", "日期", 227, 299, 120, 28, "#ffffff", 22);
centered("metric", "天气", 227, 331, 100, 30, "#ffffff", 24, "", {
  source: "temperature",
});
metric("电量", "BAT", 334, 299, 330, 83, "battery", "", "#00ddcc");
metric("气压", "PRESS", 227, 379, 402, 90, "", "1013");
const reference = {
  schemaVersion: 1,
  id: "00000000-0000-4000-8000-000000000001",
  appId: files[0].content.match(/application id="([a-f0-9]+)"/)[1],
  name: "ClownWatch",
  updated: Date.now(),
  revision: 0,
  layers,
  files,
  codeRevision: 0,
  versions: [],
};
const output = path.join(home, "frontend/public/templates/clownwatch.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(reference));
console.log(
  `ClownWatch reference: ${files.length} code files, ${layers.length} preview layers`,
);
