import { test, expect } from "@playwright/test";
import { project, validateProject } from "../src/domain";
import { widgets, insertWidget, cloneCompound } from "../src/widgets";
import { expandWidgets, expandedChildren } from "../src/compound";
import { localGenerate } from "../src/localGenerator";
import { ringProgress } from "../src/arc";
import { reading } from "../src/Scene";
const ids = [
  "activity-rings",
  "weather-band",
  "battery-dial",
  "analog-subdial",
];
for (const id of ids)
  test(`instrument is editable, copied independently and has missing/AOD semantics ${id}`, () => {
    const p = insertWidget(project("Instruments", true), id),
      root = p.layers[0],
      def = widgets.find((w) => w.id === id)!;
    validateProject(p);
    expect(p.layers).toHaveLength(1);
    expect(root.compound!.version).toBe(2);
    const q = cloneCompound(root);
    expect(
      q.compound!.layers.some((l) =>
        root.compound!.layers.some((c) => c.id === l.id),
      ),
    ).toBe(false);
    const children = expandWidgets(p).layers;
    for (const l of children) {
      if (l.kind === "ring") {
        expect(ringProgress(l, undefined, true, false)).toBe(l.ringSource === "static" ? 1 : 0);
        expect(ringProgress(l, 100, false, true)).toBe(0);
      }
      if (l.kind === "metric")
        expect(
          reading(l, {
            time: "09:41",
            heartRate: 72,
            steps: 4500,
            battery: 78,
            seconds: 0,
            missing: true,
          }),
        ).toBe("--");
    }
    const scaled = expandedChildren(
      { ...root, w: root.w * 0.8, h: root.h * 0.8 },
      p,
    );
    expect(scaled).toHaveLength(children.length);
    expect(
      localGenerate(p).find((f) => f.path === "source/App.mc")!.content,
    ).toContain("GFC_LAYER_BEGIN");
    expect(def.previews!.active).toBe("preview.svg");
  });
test("four instrument styles can be added as four objects from the library", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("InstrumentUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await page.getByText("自定义控件", { exact: true }).click();
  for (const id of ids) {
    await page.getByLabel("自定义控件样式").selectOption(id);
    await page.getByRole("button", { name: "添加控件", exact: true }).click();
  }
  await expect(page.locator(".layer-row")).toHaveCount(4);
  await expect(page.getByLabel("复合控件名称")).toHaveValue("指针副盘 #1");
});
for (const [target, size] of [
  ["venu445mm", "45mm"],
  ["venu441mm", "41mm"],
])
  test(`instrument SDK ${target}`, async ({ request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK test");
    test.setTimeout(130000);
    let p = project("InstrumentsSDK", true);
    p.target = target;
    p.deviceSize = size;
    for (const id of ids) p = insertWidget(p, id);
    const form = new FormData();
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
          const s = await (
            await request.get(`/api/builds/${job.buildId}`, { headers })
          ).json();
          if (s.status === "failed") throw Error("Instrument SDK failed");
          return s.status;
        },
        { timeout: 110000, intervals: [1000] },
      )
      .toBe("succeeded");
  });
