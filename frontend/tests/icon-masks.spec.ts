import {readFile} from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import {
  resolveControls,
  setControl,
  setSourceIcon,
} from "../src/projectControls";
import { localGenerate } from "../src/localGenerator";
import { generationHeader } from "../src/generationDto";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
function fixture() {
  const p = project("MaskFixture", true);
  p.layers = [
    {
      ...layer("metric"),
      id: "value",
      source: "steps",
      metricDecoration: false,
    },
    {
      ...layer("image"),
      id: "foot",
      name: "Foot",
      image: png,
      w: 20,
      h: 20,
      iconMask: true,
    },
    {
      ...layer("image"),
      id: "heart",
      name: "Heart",
      image: png,
      w: 20,
      h: 20,
      iconMask: true,
    },
  ];
  p.controls = [
    {
      id: "data",
      label: "Data",
      type: "dataSource",
      default: "steps",
      options: ["steps", "heartRate"],
      targets: [{ layerId: "value", property: "source" }],
    },
  ];
  return setSourceIcon(
    setSourceIcon(p, "data", "foot", "steps"),
    "data",
    "heart",
    "heartRate",
  );
}
test("source icon options project correctly and all native variants remain in output", () => {
  const p = fixture(),
    r = resolveControls(p);
  expect(r.layers.find((l) => l.id === "heart")!.activeVisible).toBe(false);
  expect(
    resolveControls(setControl(p, "data", "heartRate")).layers.find(
      (l) => l.id === "foot",
    )!.aod,
  ).toBe(false);
  const files = localGenerate(p),
    code = files.find((f) => f.path === "source/App.mc")!.content;
  expect(code).toContain('cfg_data.equals("steps")');
  expect(code).toContain('cfg_data.equals("heartRate")');
  expect(code).toContain("Rez.Fonts.GfcMask_foot");
  expect(code).toContain("Rez.Fonts.GfcMask_heart");
  expect(
    files.find((f) => f.path === "resources/fonts/fonts.xml")!.content,
  ).toContain("GfcMask_foot");
  expect(generationHeader(p).iconMaskBindings).toHaveLength(2);
});
test("icon ownership and size validation reject ambiguous or oversized mappings", () => {
  const p = fixture();
  expect(() =>
    validateProject({
      ...p,
      layers: p.layers.map((l) => (l.id === "foot" ? { ...l, w: 129 } : l)),
    }),
  ).toThrow(/单色图标/);
  const c = structuredClone(p.controls![0]);
  c.id = "other";
  c.targets = [{ layerId: "heart", property: "source" }];
  expect(() =>
    validateProject({ ...p, controls: [...p.controls!, c] }),
  ).toThrow();
  expect(() => setSourceIcon(p, "data", "unknown", "steps")).toThrow(/引用/);
  expect(() => setSourceIcon(p, "data", "heart", "battery")).toThrow();
});

test("113 prepares uploaded icon masks and compiles all source variants",async({page,request})=>{
 test.skip(process.env.GFC_TEST_SDK!=="1","Explicit SDK test");test.setTimeout(150000);const p=fixture();const data="data:image/png;base64,"+(await readFile("resources/default-watchfaces/sonar/assets/sonar_heart_icon.png")).toString("base64");p.layers=p.layers.map(l=>l.kind==="image"?{...l,image:data}:l);
 await page.goto("/");await page.evaluate(value=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open("garmin-face-creator",2);r.onsuccess=()=>{const db=r.result,t=db.transaction("projects","readwrite");t.objectStore("projects").put(value);t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>reject(t.error);};}),p);await page.reload();await page.getByRole("button",{name:"我的表盘",exact:true}).click();await page.getByRole("button",{name:"打开 MaskFixture",exact:true}).click();await expect(page.locator('svg.watch mask[id^="icon-mask-"]')).toHaveCount(1);await page.getByRole("button",{name:"本地生成（试验）",exact:true}).click();await page.getByRole("button",{name:"应用生成结果",exact:true}).click();
 const wait=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().endsWith("/api/builds"));await page.getByRole("button",{name:"编译",exact:true}).first().click();const response=await wait;expect(response.status()).toBe(202);const job=await response.json(),headers={Authorization:"Bearer "+job.accessToken};await expect.poll(async()=>{const state=await(await request.get(`/api/builds/${job.buildId}`,{headers})).json();if(state.status==="failed"){const logs=await(await request.get(`/api/builds/${job.buildId}/logs`,{headers})).json();throw Error(JSON.stringify(logs));}return state.status;},{timeout:110000,intervals:[1000]}).toBe("succeeded");
});
