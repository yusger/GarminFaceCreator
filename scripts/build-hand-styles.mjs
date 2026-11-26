import { readdir, readFile, mkdir, cp, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const styles = [];
for (const item of await readdir("resources/default-controls/hands", {
  withFileTypes: true,
})) {
  if (!item.isDirectory()) continue;
  const dir = resolve("resources/default-controls/hands", item.name),
    p = JSON.parse(await readFile(resolve(dir, "hand.json"), "utf8"));
  if (
    p.format !== "gfc-hand-style" ||
    p.formatVersion !== 1 ||
    p.id !== item.name ||
    p.geometry.kind !== "normalized-polygon" ||
    p.geometry.points.length < 3 ||
    p.geometry.points.length > 32 ||
    p.geometry.points.some(
      (v) =>
        !Array.isArray(v) ||
        v.length !== 2 ||
        v.some((n) => !Number.isFinite(n) || n < -1 || n > 1),
    )
  )
    throw Error("Invalid hand style");
  await readFile(resolve(dir, "LICENSE"));
  await mkdir(resolve("frontend/public/hand-styles", p.id), {
    recursive: true,
  });
  await cp(dir, resolve("frontend/public/hand-styles", p.id), {
    recursive: true,
  });
  styles.push(p);
}
await writeFile(
  "frontend/src/handStyleCatalog.json",
  JSON.stringify(styles, null, 2) + "\n",
);
console.log("Native hand polygon styles:", styles.length);
