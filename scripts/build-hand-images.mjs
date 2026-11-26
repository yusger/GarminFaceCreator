import Ajv from "ajv";
import { readFile, readdir, mkdir, cp, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const schema = JSON.parse(
  await readFile("resources/schemas/hand-image-pack.schema.json", "utf8"),
);
const validate = new Ajv({ strict: false, allErrors: true }).compile(schema);
const sets = [],
  notices = [],
  keys = new Set();
for (const item of await readdir("resources/default-controls/hand-images", {
  withFileTypes: true,
})) {
  if (!item.isDirectory()) continue;
  const dir = resolve("resources/default-controls/hand-images", item.name);
  const manifest = JSON.parse(
    await readFile(resolve(dir, "manifest.json"), "utf8"),
  );
  if (!validate(manifest) || manifest.id !== item.name)
    throw Error("Invalid hand image pack: " + JSON.stringify(validate.errors));
  const license = await readFile(resolve(dir, "LICENSE"), "utf8");
  const notice = await readFile(resolve(dir, "NOTICE.md"), "utf8").catch(
    () =>
      manifest.name +
      " / " +
      manifest.authors.join(", ") +
      " / " +
      manifest.license,
  );
  notices.push({
    packId: manifest.id,
    version: manifest.version,
    notice,
    license,
  });
  for (const set of manifest.sets) {
    const key = manifest.id + "/" + set.id;
    if (keys.has(key)) throw Error("Duplicate hand set");
    keys.add(key);
    const images = {};
    for (const role of ["hour", "minute", "second", "cap"]) {
      const path = set.resources[role];
      if (!/^hands\/[a-z0-9-]+\.png$/.test(path))
        throw Error("Unsafe hand image path");
      const data = await readFile(resolve(dir, path));
      if (
        data.length > 4 * 1024 * 1024 ||
        data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
        data.readUInt32BE(16) !== 400 ||
        data.readUInt32BE(20) !== 400
      )
        throw Error("Hand image canvas mismatch");
      images[role] = "data:image/png;base64," + data.toString("base64");
    }
    sets.push({
      key,
      packId: manifest.id,
      id: set.id,
      name: set.name,
      description: set.description,
      version: manifest.version,
      images,
    });
  }
  await mkdir(resolve("frontend/public/hand-images", manifest.id), {
    recursive: true,
  });
  await cp(dir, resolve("frontend/public/hand-images", manifest.id), {
    recursive: true,
  });
}
await writeFile(
  "frontend/src/handImageCatalog.json",
  JSON.stringify(sets, null, 2) + "\n",
);
await writeFile(
  "frontend/src/handImageAttribution.json",
  JSON.stringify(notices, null, 2) + "\n",
);
console.log("Original bitmap hand sets:", sets.length);
