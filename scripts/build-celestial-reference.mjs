import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { project, layer } from "../frontend/src/domain.ts";
import { localGenerate } from "../frontend/src/localGenerator.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  publicRoot = join(root, "frontend/public"),
  source = process.env.GFC_CELESTIAL_SOURCE,
  commit = "c5d124c54866f23dbee7528a488c3802d120b715";
if (!source)
  throw Error(
    "Set GFC_CELESTIAL_SOURCE to the pinned source texts. No upstream scripts run.",
  );
const originals = {};
for (const [path, hash] of Object.entries({
  LICENSE: "8c716634c51ebe3bd1b71db8dc241b01828a6e7d359ea72d9e11bf1f3f3aeba4",
  "README.md":
    "70bdfe2b088ba83f69c1423ce1f9bb271847b10ffe9554e6226a0eafa3ebcb65",
  "celestial/source/celestialView.mc":
    "ecc6ab4b07b7ca9d474e76727fa8021efe9a0c92f721122a11e34ec47e3c2bd1",
})) {
  const bytes = await readFile(resolve(source, path));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error("Pinned upstream file mismatch: " + path);
  originals[path] = bytes;
}
const p = project("Celestial", true);
p.id = "00000000-0000-4000-8000-000000000009";
p.appId = "da2ef8b78ca14d51bfe15923811ba50f";
p.target = "venu445mm";
p.deviceSize = "45mm";
p.updated = 0;
let serial = 0;
function add(kind, name, props) {
  const l = {
    ...layer(kind),
    ...props,
    id: `celestial_${String(++serial).padStart(3, "0")}`,
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
  color: "#000000",
  fillEnabled: true,
  strokeEnabled: false,
  allowClip: true,
  aod: true,
  aodColor: "#000000",
});
add("celestial", "天空", {
  x: 0,
  y: 0,
  w: 454,
  h: 268,
  solarPart: "sky",
  color: "#326a88",
  solarNightColor: "#0b1829",
  solarMissingColor: "#17212c",
});
add("celestial", "日月标记", {
  x: 50,
  y: 80,
  w: 354,
  h: 180,
  solarPart: "body",
  color: "#ffce60",
  solarNightColor: "#dfedff",
});
add("rect", "地景", {
  x: 0,
  y: 260,
  w: 454,
  h: 194,
  color: "#101b1c",
  fillEnabled: true,
  strokeEnabled: false,
  allowClip: true,
  cornerRadius: 0,
});
add("rect", "左侧地景", {
  x: 0,
  y: 250,
  w: 144,
  h: 35,
  color: "#101b1c",
  fillEnabled: true,
  strokeEnabled: false,
  allowClip: true,
  cornerRadius: 0,
});
add("rect", "右侧地景", {
  x: 310,
  y: 240,
  w: 144,
  h: 45,
  color: "#101b1c",
  fillEnabled: true,
  strokeEnabled: false,
  allowClip: true,
  cornerRadius: 0,
});
add("date", "日期", {
  x: 145,
  y: 40,
  w: 164,
  h: 30,
  size: 20,
  garminFont: "xtiny",
  color: "#dbe9f0",
});
add("text", "标题", {
  text: "CELESTIAL",
  x: 137,
  y: 282,
  w: 180,
  h: 28,
  size: 16,
  garminFont: "xtiny",
  color: "#7e9b99",
});
add("time", "时间", {
  x: 65,
  y: 317,
  w: 324,
  h: 95,
  size: 80,
  garminFont: "numberHot",
  color: "#e5eff4",
  aodColor: "#6f7c82",
});
add("metric", "电量", {
  source: "battery",
  label: "BAT",
  x: 150,
  y: 412,
  w: 154,
  h: 28,
  size: 18,
  garminFont: "xtiny",
  color: "#acc8c1",
  threshold: true,
  thresholdFallback: "#718079",
});
p.files = localGenerate(p).map((f) =>
  f.path === "source/App.mc"
    ? {
        ...f,
        content: f.content.replace(
          "\n",
          "\n// Celestial Creator theme/layout adaptation of Cutwell/garmin-celestial-watchface @ " +
            commit +
            "; original MIT; Creator native templates GPL-3.0-or-later. See notices.\n",
        ),
      }
    : f,
);
p.codeRevision = p.revision;
p.codeProvenance = { primary: "reference" };
await writeFile(
  join(publicRoot, "templates/celestial.json"),
  JSON.stringify(p, null, 2) + "\n",
);
for (const [path, name] of [
  ["LICENSE", "Celestial-LICENSE.txt"],
  ["README.md", "Celestial-README.md"],
  ["celestial/source/celestialView.mc", "Celestial-original-View.mc.txt"],
])
  await writeFile(join(publicRoot, "reference-notices", name), originals[path]);
console.log(
  "Built Celestial Creator adaptation",
  commit,
  p.layers.length,
  "editable layers",
);
