import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import {
  selectTheme,
  resetTheme,
  validateThemes,
  mergeThemeLayers,
} from "../src/themes";
import { resolveControls, setControl } from "../src/projectControls";
import { localGenerate } from "../src/localGenerator";
import { generationHeader } from "../src/generationDto";
import { withEditorLayers } from "../src/editorHistory";
export function themedFixture() {
  const p = project("ThemeFixture", true);
  p.layers = [
    { ...layer("time"), id: "apex-time", color: "#FF6A1A" },
    { ...layer("time"), id: "trail-time", color: "#FFC04A", y: 80 },
  ];
  p.controls = p.layers.map((l, i) => ({
    id: i ? "trail-color" : "apex-color",
    label: i ? "Trail Color" : "Apex Color",
    type: "color" as const,
    default: l.color,
    targets: [{ layerId: l.id, property: "color" as const }],
  }));
  p.themes = {
    version: 1,
    activeId: "apex",
    defaultId: "apex",
    presets: [
      {
        id: "apex",
        name: "Apex",
        version: "1.0.0",
        backgroundColor: "#0E1319",
        layerIds: ["apex-time"],
        controlIds: ["apex-color"],
      },
      {
        id: "trail",
        name: "Trail",
        version: "1.0.0",
        backgroundColor: "#17140E",
        layerIds: ["trail-time"],
        controlIds: ["trail-color"],
      },
    ],
  };
  return p;
}
test("complete presets keep per-theme overrides and reset only the current theme", () => {
  let p = themedFixture();
  p = setControl(p, "apex-color", "#123456");
  p = selectTheme(p, "trail");
  expect(resolveControls(p).layers.map((l) => l.id)).toEqual(["trail-time"]);
  expect(resolveControls(p).backgroundColor).toBe("#17140E");
  p = setControl(p, "trail-color", "#654321");
  p = selectTheme(p, "apex");
  expect(resolveControls(p).layers[0].color).toBe("#123456");
  p = resetTheme(p);
  expect(resolveControls(p).layers[0].color).toBe("#FF6A1A");
  expect(p.controlValues!["trail-color"]).toBe("#654321");
});
test("native output contains every preset and on-device settings in one app", () => {
  const p = themedFixture(),
    files = localGenerate(p),
    code = files.find((f) => f.path === "source/App.mc")!.content;
  expect(code).toContain("cfgTheme==0");
  expect(code).toContain("cfgTheme==1");
  expect(code).toContain("getSettingsView");
  expect(
    files.find((f) => f.path === "source/GfcThemeSettings.mc")!.content,
  ).toContain("Application.Properties.setValue");
  expect(
    files.find((f) => f.path.endsWith("properties.xml"))!.content,
  ).toContain("Gfc_Theme");
  expect(generationHeader(p).themes!.presets).toHaveLength(2);
  expect(resolveControls(p, true).layers).toHaveLength(2);
});
test("copy migration and visible-only edits preserve other preset identities", () => {
  const p = themedFixture(),
    copy = validateProject(p);
  validateThemes(copy);
  expect(copy.themes!.presets[0].layerIds).toEqual([copy.layers[0].id]);
  const edited = withEditorLayers(
    p,
    mergeThemeLayers(p, [{ ...p.layers[0], x: 42 }]),
  );
  expect(edited.layers[1]).toEqual(p.layers[1]);
  validateThemes(edited);
  const invalid = structuredClone(p);
  invalid.themes!.presets[1].layerIds = [p.layers[0].id];
  expect(() => validateThemes(invalid)).toThrow();
  const unknown = structuredClone(p);
  unknown.themes!.activeId = "missing";
  expect(resolveControls(unknown).layers[0].id).toBe("apex-time");
});
test("complete theme menu and branches compile with SDK", async ({
  request,
}) => {
  test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK test");
  test.setTimeout(130000);
  const p = themedFixture();
  p.target = "venu445mm";
  p.deviceSize = "45mm";
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: p.id,
      appId: p.appId,
      target: p.target,
      revision: p.revision,
      projectName: p.name,
    }),
  );
  for (const f of localGenerate(p))
    form.append("files", new Blob([f.content]), f.path);
  const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
    method: "POST",
    body: form,
  });
  expect(r.status).toBe(202);
  const job = await r.json(),
    headers = { Authorization: "Bearer " + job.accessToken };
  await expect
    .poll(
      async () => {
        const state = await (
          await request.get(`/api/builds/${job.buildId}`, { headers })
        ).json();
        if (state.status === "failed") {
          const logs = await (
            await request.get(`/api/builds/${job.buildId}/logs`, { headers })
          ).json();
          throw Error(JSON.stringify(logs));
        }
        return state.status;
      },
      { timeout: 110000, intervals: [1000] },
    )
    .toBe("succeeded");
});
