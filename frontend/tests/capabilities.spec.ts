import { test, expect } from "@playwright/test";
import {
  capabilityCatalog,
  createKinds,
  chatKinds,
  localLayerDiagnostics,
  localMetricSources,
} from "../src/capabilities";
import { project, layer } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { insertWidget } from "../src/widgets";
import { expandWidgets } from "../src/compound";
for (const entry of capabilityCatalog.entries)
  test("capability baseline " + entry.id, () => {
    if (entry.kind) {
      const l = layer(entry.kind as any);
      if (l.kind === "widget") {
        const p = insertWidget(project("Fixture", true), "capsule-metric");
        expect(
          expandWidgets(p).layers.every(
            (c) => !localLayerDiagnostics(c).length,
          ),
        ).toBe(true);
        return;
      }
      if (l.kind === "image") l.image = "data:image/png;base64,fixture";
      if (l.kind === "metric") {
        l.source = "steps";
        l.metricDecoration = false;
      }
      expect(localLayerDiagnostics(l)).toEqual([]);
      expect(createKinds.includes(l.kind)).toBe(entry.aiCreate);
      expect(chatKinds.includes(l.kind)).toBe(entry.chatAdd);
    } else {
      const l = {
        ...layer("metric"),
        source: entry.source!,
        metricDecoration: false,
      };
      expect(localMetricSources.includes(entry.source!)).toBe(
        entry.deterministic,
      );
      expect(localLayerDiagnostics(l).length === 0).toBe(entry.deterministic);
    }
  });
test("local diagnostics block unsupported output but do not reject editable drafts", () => {
  const p = project("Draft", true);
  p.layers = [{ ...layer("time"), rotation: 30 }];
  expect(localLayerDiagnostics(p.layers[0])[0]).toMatchObject({
    code: "LOCAL_ROTATION_UNSUPPORTED",
    layerId: p.layers[0].id,
  });
  expect(() => localGenerate(p)).toThrow(/本地生成/);
  expect(p.layers[0].rotation).toBe(30);
  expect(
    localLayerDiagnostics({ ...layer("metric"), source: "heartRate" }).some(
      (d) => d.code === "LOCAL_HEART_DECORATION_UNSUPPORTED",
    ),
  ).toBe(true);
});
for (const kind of ["time", "hand", "ring", "rect"] as const)
  test("deterministic baseline generates " + kind, () => {
    const p = project("Base", true);
    p.layers = [layer(kind)];
    expect(localGenerate(p).some((f) => f.path === "source/App.mc")).toBe(true);
  });
