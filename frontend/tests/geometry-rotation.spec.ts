import { test, expect } from "@playwright/test";
import { rotatePoint } from "../src/geometry";
import { project, layer } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { localLayerDiagnostics } from "../src/capabilities";
function fixture() {
  const p = project("RotationFixture", true);
  p.layers = [
    {
      ...layer("rect"),
      x: 100,
      y: 100,
      w: 80,
      h: 20,
      cornerRadius: 0,
      rotation: 90,
      strokeEnabled: true,
      aod: true,
    },
    {
      ...layer("line"),
      x: 100,
      y: 100,
      w: 80,
      h: 20,
      rotation: 90,
      strokeEnabled: true,
      aod: true,
    },
    {
      ...layer("circle"),
      x: 100,
      y: 200,
      w: 80,
      h: 20,
      rotation: 35,
      strokeEnabled: true,
      aod: true,
    },
    {...layer("polygon"),x:180,y:210,w:90,h:90,rotation:20,aod:true,strokeEnabled:true},
    layer("time"),
  ];
  return p;
}
test("screen rotation agrees with center pivot and native coordinates without mutating drafts", () => {
  expect(rotatePoint(100, 100, 140, 110, 90)[0]).toBeCloseTo(150);
  expect(rotatePoint(100, 100, 140, 110, 90)[1]).toBeCloseTo(70);
  const p = fixture(),
    original = JSON.stringify(p),
    files = localGenerate(p),
    src = files.find((f) => f.path === "source/App.mc")!.content;
  expect(src).toContain(
    "[px(150),px(70)],[px(150),px(150)],[px(130),px(150)],[px(130),px(70)]",
  );
  expect(src).toContain("dc.drawLine(px(150),px(70),px(130),px(150))");
  expect(JSON.stringify(p)).toBe(original);
  expect(localGenerate(p)).toEqual(files);
  for (const l of p.layers.slice(0, 3))
    expect(localLayerDiagnostics(l)).toEqual([]);
  expect(
    localLayerDiagnostics({ ...layer("time"), rotation: 20 })[0].code,
  ).toBe("LOCAL_ROTATION_UNSUPPORTED");
});
for (const [target, size] of [
  ["venu445mm", "45mm"],
  ["venu441mm", "41mm"],
])
  test(`rotated primitives and polygon compile SDK ${target}`, async ({ request }) => {
    test.skip(
      process.env.GFC_TEST_SDK !== "1",
      "Explicit SDK staging test only",
    );
    test.setTimeout(130000);
    const p = { ...fixture(), target, deviceSize: size },
      files = localGenerate(p),
      form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: p.id,
        appId: p.appId,
        target,
        revision: p.revision,
        projectName: p.name,
      }),
    );
    for (const f of files) form.append("files", new Blob([f.content]), f.path);
    const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(r.status).toBe(202);
    const job = await r.json();
    let state: any;
    await expect
      .poll(
        async () => {
          state = await (
            await request.get(`/api/builds/${job.buildId}`, {headers:job.accessToken?{Authorization:"Bearer "+job.accessToken}:{}})
          ).json();
          return state.status;
        },
        { timeout: 110000, intervals: [1000] },
      )
      .toBe("succeeded");
    expect(state.artifacts.length).toBeGreaterThan(0);
  });
