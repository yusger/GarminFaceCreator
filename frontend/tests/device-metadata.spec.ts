import { test, expect } from "@playwright/test";
import {
  deviceMetadataCatalog,
  deviceMetadataVersion,
} from "../src/deviceMetadata";
import { devices, generationDevice } from "../src/devices";
import { project, layer } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { generationDiagnostics } from "../src/generationDiagnostics";
test("all offered targets have individually sourced package facts without inventing hardware verification", () => {
  expect(new Set(devices.map((d) => d.id))).toEqual(
    new Set(deviceMetadataCatalog.map((d) => d.target)),
  );
  for (const d of devices) {
    const g = generationDevice({ target: d.id, deviceSize: d.size });
    expect(g.metadataVersion).toBe(deviceMetadataVersion);
    expect(g.metadata.width).toBe(d.pixels);
    expect(g.metadata.height).toBe(d.pixels);
    expect(g.metadata.source?.compilerSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(g.metadata.aod).toBe("unverified");
    expect(g.metadata.hardwareValidation).toBe("unverified");
    expect(g.metadata.watchFaceMemoryBytes).toBeGreaterThan(0);
  }
  expect(() => generationDevice({ target: "unknown" })).toThrow();
});
test("native code and diagnostics bind target metadata while preserving unknown verification state", () => {
  const p = project("Evidence", true);
  p.layers = [layer("time")];
  const src = localGenerate(p).find((f) => f.path === "source/App.mc")!.content;
  expect(src).toContain("device metadata sdk-metadata-1");
  expect(src).toContain("compiler SHA256 ");
  expect(generationDiagnostics(p)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        target: "venu445mm",
        mode: "both",
        capabilityId: "project.device_verification_pending",
        status: "unverified",
      }),
    ]),
  );
});
test("inspector exposes package evidence separately from real device validation", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("DeviceEvidence"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.locator("[data-generation-checks] > summary").click();
  const evidence = page.locator("[data-device-evidence]");
  await evidence.locator("summary").click();
  await expect(evidence).toContainText("454×454");
  await expect(evidence).toContainText("128.0 KiB");
  await expect(evidence).toContainText("未验证");
});
