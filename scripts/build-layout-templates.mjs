import Ajv from "ajv";
import { readdir, readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { resolve } from "node:path";
const ajv = new Ajv({ strict: false, allErrors: true });
const descriptorSchema = ajv.compile(
  JSON.parse(
    await readFile("resources/schemas/layout-template.schema.json", "utf8"),
  ),
);
const layoutSchema = ajv.compile(
  JSON.parse(await readFile("resources/schemas/layout.schema.json", "utf8")),
);
const descriptorV2 = ajv.compile(
  JSON.parse(
    await readFile("resources/schemas/layout-template-v2.schema.json", "utf8"),
  ),
);
const layoutV2 = ajv.compile(
  JSON.parse(await readFile("resources/schemas/layout-v2.schema.json", "utf8")),
);
const fonts = JSON.parse(
  await readFile("resources/shared/fonts/catalog.json", "utf8"),
);
const icons = JSON.parse(
  await readFile("resources/default-imgs/icons/catalog.json", "utf8"),
).icons;
const catalog = [];
for (const item of await readdir("resources/default-watchfaces-template", {
  withFileTypes: true,
})) {
  if (!item.isDirectory()) continue;
  const dir = resolve("resources/default-watchfaces-template", item.name);
  const descriptor = JSON.parse(
    await readFile(resolve(dir, "template.json"), "utf8"),
  );
  const layout = JSON.parse(
    await readFile(resolve(dir, "layout.json"), "utf8"),
  );
  const metaCheck =
      descriptor.formatVersion === 2 ? descriptorV2 : descriptorSchema,
    layerCheck = descriptor.formatVersion === 2 ? layoutV2 : layoutSchema;
  if (!metaCheck(descriptor))
    throw Error(
      "Invalid template metadata: " + JSON.stringify(metaCheck.errors),
    );
  if (!layerCheck(layout))
    throw Error(
      "Invalid template layers: " + JSON.stringify(layerCheck.errors),
    );
  if (new Set(layout.layers.map((l) => l.id)).size !== layout.layers.length)
    throw Error("Duplicate template layer IDs");
  if (
    descriptor.id !== item.name ||
    descriptor.format !== "gfc-layout-template" ||
    ![1, 2].includes(descriptor.formatVersion) ||
    !["DIGITAL", "ANALOG", "HYBRID"].includes(descriptor.mode) ||
    layout.layers.length > 80
  )
    throw Error("Invalid layout template: " + item.name);
  if (descriptor.formatVersion === 2) {
    const kit = descriptor.visualKit,
      ids = new Set(layout.layers.map((l) => l.id)),
      roles = new Set(),
      owners = new Set();
    if (kit.fonts.some((id) => !fonts.some((f) => f.id === id)))
      throw Error("Unregistered kit font");
    for (const role of kit.colorRoles) {
      if (roles.has(role.id)) throw Error("Duplicate kit color role");
      roles.add(role.id);
      for (const id of role.layerIds) {
        if (
          !ids.has(id) ||
          owners.has(id) ||
          layout.layers.find((l) => l.id === id).color.toLowerCase() !==
            role.color.toLowerCase()
        )
          throw Error("Invalid kit color binding");
        owners.add(id);
      }
    }
    for (const l of layout.layers) {
      if (l.fontId) {
        const f = fonts.find((f) => f.id === l.fontId);
        if (
          !f ||
          !kit.fonts.includes(f.id) ||
          !["time", "date", "text", "metric"].includes(l.kind) ||
          ["chalk", "chalkHan"].includes(f.id)
        )
          throw Error("Invalid kit font binding");
        delete l.fontId;
        l.customFont = { id: f.id, family: f.family, file: f.file };
        l.garminFont = "auto";
      }
      if (l.iconId) {
        if (
          l.kind !== "image" ||
          !icons.some((i) => i.id === l.iconId && i.provider === "lucide")
        )
          throw Error("Invalid kit icon binding");
        l.libraryIcon = { id: l.iconId, recolor: true, strokeWidth: 2 };
        delete l.iconId;
      }
    }
  }
  for (const file of ["LICENSE", "preview.svg", "preview-aod.svg"])
    await readFile(resolve(dir, file));
  await mkdir(resolve("frontend/public/layout-templates", item.name), {
    recursive: true,
  });
  await cp(dir, resolve("frontend/public/layout-templates", item.name), {
    recursive: true,
  });
  catalog.push({ ...descriptor, ...layout });
}
await writeFile(
  "frontend/src/layoutTemplateCatalog.json",
  JSON.stringify(catalog, null, 2) + "\n",
);
console.log("Editable layout templates:", catalog.length);
