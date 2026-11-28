// Offline, read-only package admission/conversion. Never extracts archives or publishes.
import { readFile, lstat, realpath, readdir } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import Ajv2020 from "ajv/dist/2020.js";
import { validateProject } from "../frontend/src/domain.ts";
import { importLocalFont } from "../frontend/src/localFonts.ts";
import { createBitmapFontAsset } from "../frontend/src/bitmapFonts.ts";
import { projectForDevice, deviceKey } from "../frontend/src/multiDevice.ts";
import {
  localGenerate,
  LOCAL_GENERATOR_VERSION,
} from "../frontend/src/localGenerator.ts";
import { generationDiagnostics } from "../frontend/src/generationDiagnostics.ts";
import { themeLayers, themeControls } from "../frontend/src/themes.ts";
import { defaultThresholds } from "../frontend/src/thresholds.ts";
import { expandWidgets } from "../frontend/src/compound.ts";
import { resolveControls } from "../frontend/src/projectControls.ts";
import { ink } from "../frontend/src/previewData.ts";
import { validateReleaseCases } from "./reference-release-v2.mjs";
const readJSON = async (p) => JSON.parse(await readFile(p, "utf8"));
const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  allowUnionTypes: true,
});
const [manifestSchema, designSchema, casesSchema] = await Promise.all(
  [
    "theme-project-manifest-v1.schema.json",
    "theme-project-v1.schema.json",
    "theme-project-cases-v1.schema.json",
  ].map(async (f) =>
    ajv.compile(
      await readJSON(new URL("../resources/schemas/" + f, import.meta.url)),
    ),
  ),
);
const baseline = await readJSON(
  new URL(
    "../resources/capabilities/theme-project-v1-baseline.json",
    import.meta.url,
  ),
);
const check = (schema, v, label) => {
  if (!schema(v))
    throw Error(label + ": " + JSON.stringify(schema.errors).slice(0, 2500));
};
const sha = (b) => createHash("sha256").update(b).digest("hex");
function png(bytes, size) {
  if (
    bytes.length < 33 ||
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    bytes.readUInt32BE(12) !== 0x49484452 ||
    !bytes.readUInt32BE(16) ||
    !bytes.readUInt32BE(20) ||
    bytes.readUInt32BE(16) > 2048 ||
    bytes.readUInt32BE(20) > 2048 ||
    (size &&
      (bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size))
  )
    throw Error("PNG dimensions/signature mismatch");
}
export async function convertThemePackage(directory) {
  const requested = resolve(directory);
  if ((await lstat(requested)).isSymbolicLink())
    throw Error("Linked package root");
  const root = await realpath(requested),
    loaded = new Map();
  let total = 0;
  async function file(name) {
    if (
      typeof name !== "string" ||
      !name ||
      !/^[A-Za-z0-9_./-]+$/.test(name) ||
      name.startsWith("/") ||
      name.split("/").some((p) => !p || p === "." || p === "..")
    )
      throw Error("Unsafe package path");
    if (loaded.has(name)) return loaded.get(name);
    let path = root;
    for (const part of name.split("/")) {
      path = join(path, part);
      if ((await lstat(path)).isSymbolicLink()) throw Error("Linked resource");
    }
    path = await realpath(path);
    const stat = await lstat(path);
    if (
      !path.startsWith(root + sep) ||
      !stat.isFile() ||
      stat.size < 1 ||
      stat.size > 8388608
    )
      throw Error("Invalid resource size/path");
    total += stat.size;
    if (total > 26214400) throw Error("Package exceeds 25MiB");
    const bytes = await readFile(path);
    loaded.set(name, bytes);
    return bytes;
  }
  const manifest = JSON.parse((await file("publish.json")).toString("utf8"));
  check(manifestSchema, manifest, "Manifest");
  const inventory = new Map(),
    actual = [];
  let entries = 0;
  for (const f of manifest.files) {
    const key = f.path.toLowerCase();
    if (key === "publish.json" || inventory.has(key))
      throw Error("Duplicate inventory");
    const bytes = await file(f.path);
    if (bytes.length !== f.bytes || sha(bytes) !== f.sha256)
      throw Error("Inventory fingerprint mismatch: " + f.path);
    inventory.set(key, f);
  }
  async function walk(path, prefix = "", depth = 0) {
    if (depth > 8) throw Error("Directory nesting budget");
    for (const e of await readdir(path, { withFileTypes: true })) {
      if (++entries > 200) throw Error("Directory entry budget");
      const name = prefix + e.name;
      if (e.isSymbolicLink()) throw Error("Linked package entry");
      if (e.isDirectory())
        await walk(join(path, e.name), name + "/", depth + 1);
      else if (e.isFile()) {
        actual.push(name);
        if (actual.length > 101) throw Error("Too many files");
      } else throw Error("Special package entry");
    }
  }
  await walk(root);
  if (
    actual.length !== inventory.size + 1 ||
    actual.some(
      (n) => n !== "publish.json" && inventory.get(n.toLowerCase())?.path !== n,
    )
  )
    throw Error("Undeclared package file");
  const claimed = new Set();
  async function resource(name, role) {
    const f = inventory.get(name?.toLowerCase());
    if (!f || f.path !== name || f.role !== role)
      throw Error("Missing inventory role " + role + ": " + name);
    claimed.add(name);
    return file(name);
  }
  const p = JSON.parse(
    (await resource("design.json", "design")).toString("utf8"),
  );
  check(designSchema, p, "Design");
  const cases = JSON.parse(
    (await resource("cases.json", "cases")).toString("utf8"),
  );
  check(casesSchema, cases, "Cases");
  if (manifest.name !== p.name || !p.themes)
    throw Error("Name/themes mismatch");
  const notice = await resource(manifest.origin.noticeFile, "notice");
  if (!notice.toString("utf8").trim()) throw Error("Empty origin license");
  const layers = () =>
    [...(p.layers || []), ...(p.multiDevice?.master || [])].flatMap((l) => [
      l,
      ...(l.compound?.layers || []),
    ]);
  // References have global identities; current layers and multi-device master may repeat that identity.
  const imageIds = new Set();
  for (const b of manifest.images) {
    if (imageIds.has(b.layerId)) throw Error("Duplicate image binding");
    imageIds.add(b.layerId);
    const matches = layers().filter(
      (l) => l.id === b.layerId && l.kind === "image",
    );
    if (!matches.length) throw Error("Dangling image binding");
    const bytes = await resource(b.file, "image");
    png(bytes);
    const license = await resource(b.noticeFile, "notice");
    if (!license.toString("utf8").trim()) throw Error("Empty image license");
    for (const l of matches)
      l.image = "data:image/png;base64," + bytes.toString("base64");
  }
  for (const l of layers())
    if (l.kind === "image" && !imageIds.has(l.id))
      throw Error("Unbound image " + l.id);
  const fontIds = new Set();
  for (const f of manifest.fonts) {
    if (fontIds.has(f.id)) throw Error("Duplicate font binding");
    fontIds.add(f.id);
    const bytes = await resource(f.file, "font"),
      license = (await resource(f.noticeFile, "notice")).toString("utf8");
    if (!license.trim()) throw Error("Empty font license");
    let asset;
    if (f.kind === "bitmap") {
      if (!f.atlas) throw Error("Bitmap atlas required");
      const atlas = await resource(f.atlas, "font");
      png(atlas);
      asset = createBitmapFontAsset(
        bytes.toString("utf8"),
        "data:image/png;base64," + atlas.toString("base64"),
        license,
        f.source,
      );
      if (asset.id !== f.id || asset.family !== f.family)
        throw Error("Bitmap identity mismatch");
      (p.bitmapFonts ??= []).push(asset);
    } else {
      if (f.atlas || !f.file.toLowerCase().endsWith("." + f.kind))
        throw Error("Font format mismatch");
      asset = await importLocalFont(
        new File([bytes], "font." + f.kind),
        license,
        f.source,
      );
      asset.family = f.family;
      if (asset.id !== f.id) throw Error("Font identity mismatch");
      (p.localFonts ??= []).push(asset);
    }
  }
  for (const l of layers())
    if (l.customFont) {
      const f =
        p.localFonts?.find((f) => f.id === l.customFont.id) ||
        baseline.fonts.find((f) => f.id === l.customFont.id);
      if (
        !f ||
        f.file !== l.customFont.file ||
        f.family !== l.customFont.family
      )
        throw Error("Unapproved font reference");
    }
  for (const f of baseline.fonts)
    if (
      sha(
        await readFile(
          new URL("../resources/shared/fonts/" + f.file, import.meta.url),
        ),
      ) !== f.sha256
    )
      throw Error("Pinned font bytes changed");
  const targets = p.multiDevice?.variants.map((v) => ({
    target: v.target,
    deviceSize: v.deviceSize,
  })) || [{ target: p.target, deviceSize: p.deviceSize }];
  if (
    JSON.stringify(
      [...targets].sort((a, b) => a.target.localeCompare(b.target)),
    ) !==
    JSON.stringify(
      [...manifest.targets].sort((a, b) => a.target.localeCompare(b.target)),
    )
  )
    throw Error("Target inventory mismatch");
  validateProject(p);
  const previewKeys = new Set();
  for (const v of manifest.previews) {
    const t = targets.find((t) => t.target === v.target);
    if (!t || !p.themes.presets.some((t) => t.id === v.themeId))
      throw Error("Unknown preview scope");
    const key = [v.themeId, v.target, v.mode].join("/");
    if (previewKeys.has(key)) throw Error("Duplicate preview scope");
    previewKeys.add(key);
    png(
      await resource(v.file, "preview"),
      t.target === "venu441mm" ? 390 : 454,
    );
  }
  const caseIds = new Set();
  for (const c of cases.cases) {
    if (caseIds.has(c.id)) throw Error("Duplicate case");
    caseIds.add(c.id);
    if (
      !targets.some((t) => t.target === c.target) ||
      !p.themes.presets.some((t) => t.id === c.themeId)
    )
      throw Error("Unknown case scope");
    if (
      c.scenario === "zero" &&
      (c.data.missing ||
        !Object.keys(c.data.values).length ||
        Object.values(c.data.values).some((v) => v !== 0))
    )
      throw Error("Zero case must contain zero values");
    if (c.scenario === "missing" && !c.data.missing)
      throw Error("Missing case must mark missing");
    if (c.scenario === "normal" && c.data.missing)
      throw Error("Normal case cannot mark missing");
  }
  const results = [];
  for (const target of targets) {
    const variant = p.multiDevice
      ? projectForDevice(p, deviceKey(target))
      : structuredClone(p);
    const diagnostics = generationDiagnostics(variant);
    if (diagnostics.some((d) => d.status === "unsupported"))
      throw Error(
        "Unsupported native mapping: " +
          diagnostics
            .filter((d) => d.status === "unsupported")
            .map((d) => d.code)
            .join(","),
      );
    const files = localGenerate(variant);
    for (const theme of p.themes.presets) {
      const q = structuredClone(variant);
      q.themes.activeId = theme.id;
      const group = cases.cases.filter(
        (c) => c.target === target.target && c.themeId === theme.id,
      );
      for (const mode of ["active", "aod"]) {
        if (!previewKeys.has([theme.id, target.target, mode].join("/")))
          throw Error("Missing preview matrix cell");
        for (const scenario of ["normal", "zero", "missing"])
          if (!group.some((c) => c.mode === mode && c.scenario === scenario))
            throw Error("Missing fixed case matrix cell");
        const visible = resolveControls(expandWidgets(q)).layers.filter(
          (l) =>
            !l.hidden &&
            l.exportIncluded !== false &&
            (mode === "active" ? l.activeVisible !== false : l.aod),
        );
        if (!visible.some((l) => l.kind === "time" || l.kind === "hand"))
          throw Error("Real time control required in every mode/theme");
      }
      const activeControls = themeControls(q),
        allowedControls = new Set(activeControls.map((c) => c.id));
      for (const c of group)
        if (Object.keys(c.controlValues).some((id) => !allowedControls.has(id)))
          throw Error("Case configuration belongs to another theme");
      for (const c of activeControls.filter((c) => c.type === "dataSource"))
        for (const option of c.options || [])
          if (
            !group.some(
              (sample) =>
                (sample.controlValues[c.id] ?? c.default) === option &&
                (option === c.default || sample.scenario === "source"),
            )
          )
            throw Error("Missing data-source case " + c.id + "/" + option);
      for (const l of themeLayers(q).filter(
        (l) => l.threshold && ["metric", "meter"].includes(l.kind),
      )) {
        const boundaries = [
          ...new Set(
            (l.thresholdRules || defaultThresholds(l.source, l.color))
              .flatMap((r) => [r.min, r.max])
              .filter((v) => Number.isFinite(v)),
          ),
        ];
        for (const value of boundaries)
          if (
            !group.some(
              (c) =>
                c.scenario === "threshold" &&
                !c.data.missing &&
                c.data.values[l.source] === value,
            )
          )
            throw Error("Missing threshold boundary " + l.id + "/" + value);
      }
      for (const c of group) {
        const copy = {
            ...q,
            controlValues: { ...q.controlValues, ...c.controlValues },
          },
          visible = resolveControls(expandWidgets(copy)).layers;
        for (const [id, expected] of Object.entries(c.expect.colors || {})) {
          const l = visible.find((l) => l.id === id);
          if (
            !l ||
            ink(l, {
              ...c.data,
              heartRate: NaN,
              steps: NaN,
              battery: NaN,
              seconds: 0,
            }).toLowerCase() !== expected.toLowerCase()
          )
            throw Error("Color mismatch in " + c.id + "/" + id);
        }
        if (
          c.scenario === "threshold" &&
          themeLayers(q).some(
            (l) => l.threshold && !Object.hasOwn(c.expect.colors || {}, l.id),
          )
        )
          throw Error("Threshold case needs expected colors");
      }
      // The existing fixed-data semantic evaluator is reused, without mutating its frozen schema/profile.
      validateReleaseCases(q, {
        format: "gfc-reference-release-cases",
        formatVersion: 1,
        cases: group.map(
          ({
            themeId,
            target,
            scenario,
            expect: { colors, ...expect },
            ...rest
          }) => ({ ...rest, expect }),
        ),
      });
    }
    results.push({ target: target.target, files, diagnostics });
  }
  for (const f of inventory.values())
    if (!claimed.has(f.path)) throw Error("Unused inventory file " + f.path);
  return {
    project: p,
    targets: results,
    report: {
      profile: manifest.profile,
      schemaVersion: 49,
      themes: p.themes.presets.length,
      targets: targets.length,
      cases: cases.cases.length,
      inventoryFiles: inventory.size,
      totalBytes: total,
      generatorVersion: LOCAL_GENERATOR_VERSION,
      publication: "not performed",
      sdk: "not run",
      simulator: "not run",
      hardware: "unverified",
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(
      (await convertThemePackage(process.argv[2])).report,
      null,
      2,
    ),
  );
