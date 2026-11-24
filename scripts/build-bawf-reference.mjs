import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { project, layer } from "../frontend/src/domain.ts";
import { localGenerate } from "../frontend/src/localGenerator.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  publicRoot = join(root, "frontend/public"),
  source = process.env.GFC_BAWF_SOURCE,
  commit = "243293ba4d2a4f03c4ed767bb072a7838386c741";
if (!source)
  throw Error(
    "Set GFC_BAWF_SOURCE to the pinned source texts. No upstream scripts run.",
  );
const originals = {};
for (const [path, hash] of Object.entries({
  "README.md":
    "16176db6e5c94f168dac1b6711323c2c93cdcfb1451235185b2aaa2c98a750df",
  "source/BAWFApp.mc":
    "78d3850e7246d225f1e44b7b4a1764da985a610ad74e6023c1a41f3c2de167ca",
  "source/BAWFView.mc":
    "1f65714f011eee9e0334ee1914ff1bf4cceca05c960d1bba0870da9c811e256a",
})) {
  const bytes = await readFile(resolve(source, path));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error("Pinned upstream file mismatch: " + path);
  originals[path] = bytes;
}
const originalHeader = originals["source/BAWFView.mc"]
  .toString("utf8")
  .match(/^\/\*[\s\S]*?\*\//)?.[0];
if (
  !originalHeader?.includes("Copyright (c)2018-2023 Kevin Boone") ||
  !originalHeader.includes("GNU Public Licence, v3.0")
)
  throw Error("Explicit upstream license header not found");
const p = project("BAWF", true);
p.id = "00000000-0000-4000-8000-000000000010";
p.appId = "c809e1e240394e5392c47e46c34f4098";
p.target = "venu445mm";
p.deviceSize = "45mm";
p.updated = 0;
let serial = 0;
function add(kind, name, props) {
  const l = {
    ...layer(kind),
    ...props,
    id: `bawf_${String(++serial).padStart(3, "0")}`,
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
for (let i = 1; i <= 12; i++) {
  const a = (i * Math.PI) / 6;
  add("text", "时标" + String(i).padStart(2, "0"), {
    text: String(i),
    x: Number((227 + Math.sin(a) * 190 - 24).toFixed(4)),
    y: Number((227 - Math.cos(a) * 190 - 18).toFixed(4)),
    w: 48,
    h: 36,
    size: 22,
    garminFont: "xtiny",
    color: "#ffffff",
    aod: i % 3 === 0,
    aodColor: "#666666",
  });
}
add("date", "日期", {
  x: 140,
  y: 115,
  w: 174,
  h: 34,
  size: 20,
  garminFont: "xtiny",
  color: "#ffffff",
});
add("metric", "电量", {
  source: "battery",
  precision: 0,
  x: 156,
  y: 316,
  w: 142,
  h: 34,
  size: 20,
  garminFont: "xtiny",
  color: "#ffffff",
  threshold: false,
});
add("hand", "时针", {
  handType: "hour",
  handReach: 0.66,
  handTail: 0.12,
  strokeWidth: 9,
  color: "#ffffff",
  aod: true,
  aodColor: "#777777",
});
add("hand", "分针", {
  handType: "minute",
  handReach: 0.88,
  handTail: 0.12,
  strokeWidth: 5,
  color: "#ffffff",
  aod: true,
  aodColor: "#777777",
});
add("circle", "转轴", {
  x: 221,
  y: 221,
  w: 12,
  h: 12,
  color: "#ffffff",
  fillEnabled: true,
  strokeEnabled: false,
  aod: true,
  aodColor: "#777777",
});
p.files = localGenerate(p).map((f) =>
  f.path === "source/App.mc"
    ? {
        ...f,
        content: f.content.replace(
          "\n",
          "\n" +
            originalHeader +
            "\n// BAWF Creator layout adaptation of kevinboone/BAWF @ " +
            commit +
            "; original GPLv3 header retained; Creator templates GPL-3.0-or-later. See notices.\n",
        ),
      }
    : f,
);
p.codeRevision = p.revision;
p.codeProvenance = { primary: "reference" };
await writeFile(
  join(publicRoot, "templates/bawf.json"),
  JSON.stringify(p, null, 2) + "\n",
);
for (const [path, name] of [
  ["README.md", "BAWF-README.md"],
  ["source/BAWFApp.mc", "BAWF-original-App.mc.txt"],
  ["source/BAWFView.mc", "BAWF-original-View.mc.txt"],
])
  await writeFile(join(publicRoot, "reference-notices", name), originals[path]);
await writeFile(
  join(publicRoot, "reference-notices/BAWF-GPL-v3.txt"),
  await readFile(join(root, "LICENSE")),
);
console.log(
  "Built BAWF Creator adaptation",
  commit,
  p.layers.length,
  "editable layers",
);
