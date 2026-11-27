// Offline semantic gate only. Does not publish, install or start any service.
import Ajv2020 from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { validateProject } from "../frontend/src/domain.ts";
import { expandWidgets } from "../frontend/src/compound.ts";
import { resolveControls } from "../frontend/src/projectControls.ts";
import {
  localGenerate,
  LOCAL_GENERATOR_VERSION,
} from "../frontend/src/localGenerator.ts";
import { generationDiagnostics } from "../frontend/src/generationDiagnostics.ts";
import { capabilityCatalog } from "../frontend/src/capabilities.ts";
import { libraryFonts } from "../frontend/src/fontLibrary.ts";
import { metricValues, reading } from "../frontend/src/previewData.ts";
import { conditionVisible } from "../frontend/src/visibility.ts";
import { calendarDateLabel } from "../frontend/src/calendar.ts";
const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  allowUnionTypes: true,
});
const load = async (name) =>
  ajv.compile(
    JSON.parse(
      await readFile(
        new URL("../resources/schemas/" + name, import.meta.url),
        "utf8",
      ),
    ),
  );
const [manifestSchema, designSchema, casesSchema] = await Promise.all(
  [
    "reference-release-v2.schema.json",
    "reference-release-design-v2.schema.json",
    "reference-release-cases.schema.json",
  ].map(load),
);
const must = (validator, value, name) => {
  if (!validator(value))
    throw Error(name + ": " + JSON.stringify(validator.errors).slice(0, 2500));
};
export function validateV2Manifest(manifest) {
  must(manifestSchema, manifest, "Manifest v2");
}
export function validateReleaseV2(manifest, raw, boundImages = new Map()) {
  must(manifestSchema, manifest, "Manifest v2");
  must(designSchema, raw, "Design v2");
  if (
    manifest.name !== raw.name ||
    manifest.compatibility.targets[0].target !== raw.target ||
    manifest.compatibility.targets[0].deviceSize !== raw.deviceSize
  )
    throw Error("Manifest/design identity or target mismatch");
  if (!["venu445mm", "venu441mm"].includes(raw.target))
    throw Error("deterministic-v2 first target baseline is Venu4");
  const p = structuredClone(raw),
    all = () => p.layers.flatMap((l) => [l, ...(l.compound?.layers || [])]),
    ids = new Set();
  for (const l of all()) {
    if (ids.has(l.id)) throw Error("Duplicate global layer identity");
    ids.add(l.id);
    if (
      l.customFont &&
      !libraryFonts.some(
        (f) =>
          f.id === l.customFont.id &&
          f.family === l.customFont.family &&
          f.file === l.customFont.file,
      )
    )
      throw Error("Only the pinned licensed font catalog is allowed");
    if (l.kind === "image" && !p.layers.includes(l))
      throw Error(
        "Nested image bindings not available in this publishing profile",
      );
  }
  const bindings = new Set();
  for (const b of manifest.bindings) {
    const l = p.layers.find((l) => l.id === b.layerId && l.kind === "image");
    if (!l || bindings.has(l.id) || !boundImages.has(l.id))
      throw Error("Missing or duplicate reviewed image binding");
    bindings.add(l.id);
    l.image = boundImages.get(l.id);
  }
  if (p.layers.some((l) => l.kind === "image" && !bindings.has(l.id)))
    throw Error("Unbound image layer");
  validateProject(p);
  const declarations = new Set(manifest.compatibility.requirements),
    catalogIds = new Set(capabilityCatalog.entries.map((e) => e.id));
  for (const id of declarations) {
    if (!catalogIds.has(id)) throw Error("Unknown required capability " + id);
    if (!capabilityCatalog.entries.find((e) => e.id === id).deterministic)
      throw Error("Required capability has no deterministic mapping " + id);
  }
  for (const l of all()) {
    if (!declarations.has("core." + l.kind))
      throw Error("Missing core capability " + l.kind);
    const sources = [
      ...(["metric", "meter"].includes(l.kind) ? [l.source] : []),
      ...(l.kind === "ring" && l.ringSource !== "static"
        ? [l.ringSource || "seconds"]
        : []),
      ...(l.visibility ? [l.visibility.source] : []),
    ];
    for (const source of sources)
      if (!declarations.has("data." + source.toLowerCase()))
        throw Error("Missing data capability " + source);
  }
  for (const c of [
    ...(p.controls || []),
    ...p.layers.flatMap((l) => l.compound?.controls || []),
  ])
    for (const source of c.type === "dataSource" ? c.options : [])
      if (!declarations.has("data." + source.toLowerCase()))
        throw Error("Missing configurable data capability " + source);
  const expanded = resolveControls(expandWidgets(p)),
    controlled = new Set(
      expanded.controls.flatMap((c) => [
        ...c.targets
          .filter((t) => t.property === "activeVisible")
          .map((t) => t.layerId),
        ...(c.hideWhenChangedFromDefault || []),
      ]),
    );
  for (const mode of ["active", "aod"]) {
    const stable = expanded.layers.filter(
      (l) =>
        !l.visibility &&
        !controlled.has(l.id) &&
        l.activeVisible !== false &&
        l.exportIncluded !== false &&
        l.x >= 0 &&
        l.y >= 0 &&
        l.x + l.w <= 454 &&
        l.y + l.h <= 454 &&
        (mode !== "aod" || l.aod),
    );
    const full = stable.some(
      (l) => l.kind === "time" && (!l.timePart || l.timePart === "full"),
    );
    const digital =
      stable.some((l) => l.kind === "time" && l.timePart === "hours") &&
      stable.some((l) => l.kind === "time" && l.timePart === "minutes");
    const hands =
      stable.some(
        (l) => l.kind === "hand" && (!l.handType || l.handType === "hour"),
      ) && stable.some((l) => l.kind === "hand" && l.handType === "minute");
    if (!full && !digital && !hands)
      throw Error("Required unconditional time missing in " + mode);
  }
  const diagnostics = generationDiagnostics(p);
  if (diagnostics.some((d) => d.status === "unsupported"))
    throw Error(
      "Native mapping: " +
        diagnostics
          .filter((d) => d.status === "unsupported")
          .map((d) => d.message)
          .join("; "),
    );
  const files = localGenerate(p);
  return {
    project: p,
    files,
    diagnostics,
    generatorVersion: LOCAL_GENERATOR_VERSION,
    publication: "not performed",
    sdk: "not run",
    simulator: "not run",
    hardware: "unverified",
  };
}
export function validateReleaseCases(p, rawCases) {
  must(casesSchema, rawCases, "Cases");
  const seen = new Set(),
    modes = new Set();
  for (const sample of rawCases.cases) {
    if (seen.has(sample.id)) throw Error("Duplicate case id");
    seen.add(sample.id);
    modes.add(sample.mode);
    const date = new Date(sample.data.calendarDate + "T12:00:00Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== sample.data.calendarDate
    )
      throw Error("Invalid fixed calendar date");
    const copy = structuredClone(p),
      known = new Set(
        [
          ...(copy.controls || []),
          ...copy.layers.flatMap((l) => l.compound?.controls || []),
        ].map((c) => c.id),
      );
    for (const id of Object.keys(sample.controlValues))
      if (!known.has(id)) throw Error("Unknown case configuration " + id);
    copy.controlValues = {
      ...copy.controlValues,
      ...Object.fromEntries(
        Object.entries(sample.controlValues).filter(([id]) =>
          (copy.controls || []).some((c) => c.id === id),
        ),
      ),
    };
    for (const l of copy.layers)
      if (l.compound)
        l.compound.controlValues = {
          ...l.compound.controlValues,
          ...Object.fromEntries(
            Object.entries(sample.controlValues).filter(([id]) =>
              l.compound.controls.some((c) => c.id === id),
            ),
          ),
        };
    validateProject(copy);
    const expanded = resolveControls(expandWidgets(copy));
    const data = {
      ...sample.data,
      date: calendarDateLabel(sample.data.calendarDate),
      heartRate: NaN,
      steps: NaN,
      battery: NaN,
      seconds: sample.mode === "aod" ? 0 : (sample.data.values.seconds ?? 0),
      values: Object.fromEntries(
        capabilityCatalog.entries
          .filter((e) => e.source)
          .map((e) => [e.source, NaN]),
      ),
    };
    Object.assign(data.values, sample.data.values);
    if (sample.mode === "aod") data.values.seconds = 0;
    const visible = expanded.layers.filter(
      (l) =>
        l.exportIncluded !== false &&
        (sample.mode === "aod" || l.activeVisible !== false) &&
        conditionVisible(
          l.visibility,
          data.missing ? {} : metricValues(data),
          sample.mode === "aod",
        ) &&
        (sample.mode !== "aod" ||
          (l.aod &&
            !(
              l.aodSeconds === "hide" &&
              (l.kind === "ring" ||
                (l.kind === "metric" && l.source === "seconds"))
            ))),
    );
    if (
      JSON.stringify(visible.map((l) => l.id).sort()) !==
      JSON.stringify([...sample.expect.visibleLayerIds].sort())
    )
      throw Error("Visible layer mismatch in " + sample.id);
    if (
      visible
        .filter((l) => ["time", "date", "text", "metric"].includes(l.kind))
        .some((l) => !(l.id in sample.expect.readings))
    )
      throw Error("Missing visible text reading in " + sample.id);
    for (const [id, expected] of Object.entries(sample.expect.readings)) {
      const l = visible.find((l) => l.id === id);
      if (
        !l ||
        !["time", "date", "text", "metric"].includes(l.kind) ||
        reading(l, data) !== expected
      )
        throw Error("Reading mismatch in " + sample.id + " / " + id);
    }
  }
  if (!modes.has("active") || !modes.has("aod"))
    throw Error("Both active and AOD fixed cases are required");
  return {
    cases: seen.size,
    semantics: "shared preview data only; SDK runtime remains separate",
  };
}
