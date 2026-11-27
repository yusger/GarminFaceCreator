import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { createDataSlot, sourceSlotLayer } from "../src/dataSlots";
import { resolveControls, setControl } from "../src/projectControls";
import { localGenerate } from "../src/localGenerator";
import { withEditorLayers, editorFrame } from "../src/editorHistory";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
function fixture() {
  const p = project("SlotFixture", true);
  p.layers = [
    {
      ...layer("metric"),
      id: "value",
      source: "steps",
      metricDecoration: false,
    },
    {
      ...layer("meter"),
      id: "progress",
      source: "steps",
      meterGoal: 12345,
      meterShape: "bar",
    },
    { ...layer("text"), id: "label", sourceLabelFor: "value", text: "OLD" },
  ];
  return createDataSlot(p, ["value", "progress"], "活动数据");
}
test("one explicit slot links readings, labels and compatible goals without mutating stored layers", () => {
  const p = fixture(),
    c = p.controls![0];
  expect(c.options).toEqual(["steps", "battery"]);
  const next = setControl(p, c.id, "battery"),
    r = resolveControls(next);
  expect(r.layers[0]).toMatchObject({
    source: "battery",
    unit: "%",
    precision: 0,
  });
  expect(r.layers[1]).toMatchObject({ source: "battery", meterGoal: 100 });
  expect(r.layers[2].text).toBe("batt");
  expect(p.layers[0].source).toBe("steps");
  expect(
    resolveControls(setControl(next, c.id, "steps")).layers[1].meterGoal,
  ).toBe(12345);
  expect(() => setControl(p, c.id, "temperature")).toThrow();
});
test("default custom thresholds survive generation from another selected source", () => {
  let p = fixture();
  p.layers[0] = {
    ...p.layers[0],
    threshold: true,
    thresholdRules: [{ min: 0, color: "#123456" }],
    thresholdFallback: "#654321",
  };
  p = setControl(p, p.controls![0].id, "battery");
  const code = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(code).toContain('equals("steps")');
  expect(code).toContain('equals("battery")');
  expect(code).toContain("0x123456");
  expect(code).toContain("100");
  const restored = sourceSlotLayer(p, p.layers[0], p.controls![0], "steps");
  expect(restored.thresholdRules![0].color).toBe("#123456");
});
test("invalid bindings reject atomically; IDs, overrides and snapshots survive independent import", () => {
  const p = fixture();
  expect(() => createDataSlot(p, ["value"])).toThrow(/已有/);
  expect(() => createDataSlot({ ...p, controls: [] }, ["missing"])).toThrow();
  expect(() =>
    validateProject({
      ...p,
      controls: [{ ...p.controls![0], sourceGoals: { battery: 0 } }],
    }),
  ).toThrow(/目标/);
  const snap = saveDesignSnapshot(p, "before");
  const changed = setControl(snap, p.controls![0].id, "battery");
  const restored = restoreDesignSnapshot(changed, snap.activeDesignSnapshot!);
  expect(resolveControls(restored).layers[0].source).toBe("steps");
  const imported = validateProject(p);
  expect(imported.schemaVersion).toBe(35);
  expect(imported.controls![0].targets[0].layerId).toBe(imported.layers[0].id);
  expect(editorFrame(changed).controlValues).toEqual(changed.controlValues);
  const removed = withEditorLayers(
    p,
    p.layers.filter((l) => l.id !== "progress"),
  );
  expect(removed.controls![0].targets).toHaveLength(1);
});
test("manual format overrides and incompatible progress choices remain explicit", () => {
  const p = fixture(),
    c = p.controls![0];
  c.preserveFormatFor = ["value"];
  p.layers[0].unit = "custom";
  expect(resolveControls(setControl(p, c.id, "battery")).layers[0].unit).toBe(
    "custom",
  );
  expect(() =>
    validateProject({
      ...p,
      controls: [{ ...c, options: ["steps", "temperature"] }],
    }),
  ).toThrow(/兼容/);
});

test("linked source branches compile with the real SDK", async ({
  request,
}) => {
  test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK test");
  test.setTimeout(130000);
  const p = fixture();
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

test("113 editor creates and persists a linked source configuration",async({page})=>{
 page.on("dialog",d=>d.accept("DataSlotUI"));await page.goto("/");await page.getByRole("button",{name:/^空白画布/}).click();await page.getByLabel("初始布局",{exact:true}).selectOption("blank");await page.getByRole("button",{name:"创建项目",exact:true}).click();await page.getByRole("button",{name:"数据",exact:true}).click();
 await page.locator(".watchface-controls > summary").click();await page.getByText("创建联动数据槽",{exact:true}).click();const author=page.locator(".watchface-controls details").filter({has:page.getByText("创建联动数据槽",{exact:true})});await author.locator('input[type="checkbox"]').first().check();await page.getByRole("button",{name:"创建数据槽",exact:true}).click();await page.getByLabel("数据槽",{exact:true}).selectOption("battery");await expect(page.locator("svg.watch")).toContainText("%");
 await expect.poll(()=>page.evaluate(async()=>{return await new Promise(resolve=>{const r=indexedDB.open("garmin-face-creator",2);r.onsuccess=()=>{const db=r.result,q=db.transaction("projects").objectStore("projects").getAll();q.onsuccess=()=>{const p=q.result.find(x=>x.controls?.some(c=>c.slot));db.close();resolve(p?.controlValues?.[p.controls.find(c=>c.slot).id]);};};});})).toBe("battery");
 await page.reload();await page.getByRole("button",{name:"打开 DataSlotUI",exact:true}).click();await page.locator(".watchface-controls > summary").click();await expect(page.getByLabel("数据槽",{exact:true})).toHaveValue("battery");
});
