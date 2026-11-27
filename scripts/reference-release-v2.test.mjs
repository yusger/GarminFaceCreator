import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  validateReleaseV2,
  validateReleaseCases,
} from "./reference-release-v2.mjs";
import { checkReferenceV2 } from "./check-reference-v2.mjs";
const root = "resources/examples/reference-release-v2",
  read = async (name) => JSON.parse(await readFile(root + "/" + name, "utf8"));
const manifest = await read("publish.json"),
  design = await read("design.json"),
  cases = await read("cases.json");
test("explicit v2 example retains editable geometry and executes all six data cases without publication", async () => {
  const before = JSON.stringify(design),
    result = validateReleaseV2(manifest, design);
  assert.equal(validateReleaseCases(result.project, cases).cases, 6);
  assert.equal(JSON.stringify(design), before);
  assert.equal(result.project.layers[0].compound.version, 2);
  assert.match(
    result.files.find((f) => f.path === "source/App.mc").content,
    /drawAngledText/,
  );
  const report = await checkReferenceV2(root);
  assert.equal(report.publication, "not performed");
  assert.equal(report.sdk, "not run");
});
test("pinned v2 rejects legacy guessing, private injection, false declarations and missing unconditional clock", () => {
  for (const change of [
    (p) => (p.schemaVersion = 26),
    (p) => (p.layers[0].privatePayload = "script"),
    (p) => (p.layers[0].compound.evil = true),
    (p) =>
      (p.layers[0].compound.layers[0].polygonPoints = [
        [0, 0],
        [1, 0],
        [0.4, 0.4],
        [1, 1],
        [0, 1],
      ]),
    (p) => (p.layers[1].aod = false),
    (p) => (p.layers[1].x = 1000),
    (p) => (p.layers[1].visibility = { source: "battery", min: 10 }),
    (p) => (p.layers[0].compound.layers[1].id = p.layers[1].id),
    (p) =>
      (p.layers[1].customFont = {
        id: "fake",
        family: "Fake",
        file: "../../private.ttf",
      }),
  ]) {
    const copy = structuredClone(design);
    change(copy);
    assert.throws(() => validateReleaseV2(manifest, copy));
  }
  for (const change of [
    (p) => (p.generation.profile = "deterministic-v1"),
    (p) =>
      (p.compatibility.requirements = p.compatibility.requirements.filter(
        (x) => x !== "core.polygon",
      )),
    (p) => p.compatibility.requirements.push("data.stress"),
  ]) {
    const copy = structuredClone(manifest);
    change(copy);
    assert.throws(() => validateReleaseV2(copy, design));
  }
});
test("cases reject missing scope, wrong reads and duplicate identity; zero stays valid and each case starts fresh", () => {
  const validated = validateReleaseV2(manifest, design).project;
  for (const change of [
    (c) => (c.cases[0].expect.visibleLayerIds = []),
    (c) =>
      (c.cases[1].expect.readings[
        Object.keys(c.cases[1].expect.readings).find(
          (k) => k !== "mechanical-time",
        )
      ] = "--"),
    (c) => (c.cases[1].id = c.cases[0].id),
    (c) => (c.cases[0].controlValues.unknown = true),
    (c) => (c.cases[0].data.calendarDate = "2026-02-31"),
  ]) {
    const copy = structuredClone(cases);
    change(copy);
    assert.throws(() => validateReleaseCases(validated, copy));
  }
  const p = structuredClone(validated),
    frame = p.layers[0].compound.layers[0];
  frame.activeVisible = true;
  p.layers[0].compound.controls = [
    {
      id: "frame",
      label: "Frame",
      type: "boolean",
      default: true,
      targets: [{ layerId: frame.id, property: "activeVisible" }],
    },
  ];
  const copy = structuredClone(cases);
  copy.cases[0].controlValues.frame = false;
  copy.cases[0].expect.visibleLayerIds =
    copy.cases[0].expect.visibleLayerIds.filter((id) => id !== frame.id);
  assert.equal(validateReleaseCases(p, copy).cases, 6);
});
test("inventory tampering and undeclared file never pass a schema-only gate", async () => {
  for (const kind of ["tamper", "extra"]) {
    const dir = await mkdtemp(join(tmpdir(), "gfc-release-v2-"));
    await cp(root, dir, { recursive: true });
    await writeFile(
      join(dir, kind === "tamper" ? "design.json" : "hidden.mc"),
      "{}",
    );
    await assert.rejects(() => checkReferenceV2(dir));
  }
});
