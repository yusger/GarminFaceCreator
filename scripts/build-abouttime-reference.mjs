import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { project, layer } from "../frontend/src/domain.ts";
import { localGenerate } from "../frontend/src/localGenerator.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  publicRoot = join(root, "frontend/public"),
  source = process.env.GFC_ABOUTTIME_SOURCE,
  commit = "4fdf09bcf784ecf385b9dce546af3f277e13caa5";
if (!source)
  throw Error(
    "Set GFC_ABOUTTIME_SOURCE to the selected pinned About Time text archive. No upstream scripts are run.",
  );
const expected = {
  LICENSE: "00a2b29a7539568eb12ea2f79d0af7ce8e82fa40a59bde62ca0bae00c583dd18",
  "README.md":
    "0a28208b3c7746615168d72dcfad3e0821aa42ef33c3d9f4c325b60fc22bba5c",
  "resources-eng/strings.xml":
    "5012c9504c589d529f4ac1ac6988bf5de2fbb53e32583e243196531f7b8b8c91",
  "resources-zho/strings.xml":
    "a1a9580e8e590926c34b8de05a58b4ff6614d7e92fc3ebb759d1a20a667be891",
};
const originals = {};
for (const [path, hash] of Object.entries(expected)) {
  const bytes = await readFile(resolve(source, path));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error("Pinned upstream file mismatch: " + path);
  originals[path] = bytes;
}
const p = project("AboutTime", true);
p.id = "00000000-0000-4000-8000-000000000006";
p.appId = "f202c9ff7aad4dfda2ce6149e2e10cf9";
p.target = "venu445mm";
p.deviceSize = "45mm";
p.updated = 0;
let serial = 0;
function add(kind, name, props) {
  const l = {
    ...layer(kind),
    ...props,
    id: `about_${String(++serial).padStart(3, "0")}`,
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
  color: "#08121a",
  fillEnabled: true,
  strokeEnabled: false,
  aod: true,
  aodColor: "#000000",
  allowClip: true,
});
add("text", "标题", {
  text: "ABOUT TIME",
  x: 142,
  y: 43,
  w: 170,
  h: 28,
  size: 16,
  garminFont: "xtiny",
  color: "#70828e",
});
add("date", "日期", {
  x: 145,
  y: 90,
  w: 164,
  h: 30,
  size: 18,
  garminFont: "xtiny",
  color: "#9aadba",
});
add("wordTime", "报时上行", {
  wordLanguage: "en",
  wordRow: "top",
  x: 78,
  y: 143,
  w: 298,
  h: 48,
  size: 28,
  garminFont: "small",
  color: "#93aabd",
  aodColor: "#535e69",
});
add("wordTime", "报时中行", {
  wordLanguage: "en",
  wordRow: "middle",
  x: 78,
  y: 204,
  w: 298,
  h: 54,
  size: 32,
  garminFont: "medium",
  color: "#c4d4e0",
  aodColor: "#5e6a75",
});
add("wordTime", "报时下行", {
  wordLanguage: "en",
  wordRow: "bottom",
  x: 65,
  y: 273,
  w: 324,
  h: 70,
  size: 48,
  garminFont: "large",
  color: "#76dcba",
  aodColor: "#667e79",
});
add("line", "分隔线", {
  x: 158,
  y: 371,
  w: 138,
  h: 1,
  strokeWidth: 1,
  color: "#243643",
});
add("metric", "电量", {
  source: "battery",
  label: "BAT",
  x: 147,
  y: 391,
  w: 160,
  h: 28,
  size: 16,
  garminFont: "xtiny",
  color: "#8ea2b0",
});
p.files = localGenerate(p).map((f) =>
  f.path === "source/App.mc"
    ? {
        ...f,
        content: f.content.replace(
          "\n",
          "\n// AboutTime Creator layout adaptation of samuelmr/garmin-abouttime @ " +
            commit +
            "; upstream locale phrases MIT; Creator templates GPL-3.0-or-later. See notices.\n",
        ),
      }
    : f,
);
p.codeRevision = 0;
p.codeProvenance = { primary: "reference" };
await writeFile(
  join(publicRoot, "templates/abouttime.json"),
  JSON.stringify(p, null, 2) + "\n",
);
for (const [path, name] of [
  ["LICENSE", "AboutTime-LICENSE.txt"],
  ["README.md", "AboutTime-README.md"],
  ["resources-eng/strings.xml", "AboutTime-English-strings.xml"],
  ["resources-zho/strings.xml", "AboutTime-Chinese-strings.xml"],
])
  await writeFile(join(publicRoot, "reference-notices", name), originals[path]);
console.log(
  "Built AboutTime Creator adaptation",
  commit,
  p.layers.length,
  "editable layers",
);
