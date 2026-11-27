import { test, expect } from "@playwright/test";
import { layer, project, validateProject } from "../src/domain";
import { resolveControls } from "../src/projectControls";
import { generationLayer } from "../src/generationDto";
import { localGenerate } from "../src/localGenerator";
import { validMetricValue, nativeMetricValidation } from "../src/metricFormat";
import { readoutWidthCheck } from "../src/readoutLayout";
test("source formatting follows every setting option without replacing manual formats", () => {
  const p = project("Format", true),
    l = {
      ...layer("metric"),
      source: "steps",
      autoSourceFormat: true,
      unit: "old",
      label: "old",
      precision: 3,
      metricDecoration: true,
      readoutSample: "99999",
    };
  p.layers = [l];
  p.controls = [
    {
      id: "data",
      label: "Data",
      type: "dataSource",
      default: "steps",
      options: ["steps", "temperature", "distance", "heartRate"],
      targets: [{ layerId: l.id, property: "source" }],
    },
  ];
  const before = JSON.stringify(p);
  for (const [source, unit, precision, label] of [
    ["steps", "", 0, "steps"],
    ["temperature", "°C", 1, "temp"],
    ["distance", "", 2, "km"],
    ["heartRate", "", 0, "bpm"],
  ]) {
    const q = resolveControls({ ...p, controlValues: { data: source } });
    expect(q.layers[0]).toMatchObject({
      unit,
      precision,
      label,
      metricDecoration: false,
    });
  }
  expect(JSON.stringify(p)).toBe(before);
  const native = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(native).toContain('"temperature","temp ","°C",1');
  expect(native).toContain('"distance","km ","",2');
  expect(native).not.toContain('"old"');
  expect(generationLayer(l)).not.toHaveProperty("readoutSample");
  const p2 = structuredClone(p);
  p2.layers[0].readoutSample = "1234567890123456789";
  expect(localGenerate(p2)).toEqual(localGenerate(p));
  expect(
    resolveControls({ ...p, layers: [{ ...l, autoSourceFormat: false }] })
      .layers[0].unit,
  ).toBe("old");
  expect(() =>
    validateProject({
      ...p,
      layers: [{ ...l, autoSourceFormat: "yes" as any }],
    }),
  ).toThrow();
  expect(
    readoutWidthCheck(resolveControls(p).layers[0], (text) => text.length * 10)
      .overflow,
  ).toBe(false);
});
test("metric validity preserves zero and negative physical readings but rejects sentinels", () => {
  for (const [source, value, valid] of [
    ["steps", 0, true],
    ["steps", -1, false],
    ["heartRate", 0, false],
    ["heartRate", 120, true],
    ["battery", 100, true],
    ["battery", 101, false],
    ["temperature", -10, true],
    ["temperature", -274, false],
    ["altitude", -59, true],
    ["seconds", 60, false],
    ["humidity", 101, false],
    ["distance", NaN, false],
    ["calories", Infinity, false],
  ] as const)
    expect(validMetricValue(source, value), source + value).toBe(valid);
  const native = nativeMetricValidation();
  expect(native).toContain('source.equals("heartRate")');
  expect(native).toContain("value>0");
  expect(native).toContain("value>=-273.15");
  const l = {
    ...layer("metric"),
    source: "battery",
    unit: "%",
    label: "BATT",
    w: 10,
  };
  expect(readoutWidthCheck(l, (text) => text.length * 10)).toMatchObject({
    text: "BATT 100%",
    overflow: true,
  });
});
test("editor exposes optional source formatting and readout-only overflow checks", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("FormatUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "数据", exact: true }).click();
  await page.getByLabel("自动匹配数据源格式").check();
  await page.getByLabel("数据源", { exact: true }).selectOption("temperature");
  await expect(page.getByLabel("数据单位", { exact: true })).toHaveValue("°C");
  await expect(page.getByLabel("小数位", { exact: true })).toHaveValue("1");
  await page.getByLabel("最大读数样本").fill("99999999999999999999");
  await expect(page.locator(".readout-check")).toContainText("可能溢出");
  await expect(page.locator("svg.watch")).not.toContainText(
    "99999999999999999999",
  );
  await page.getByLabel("数据单位", { exact: true }).fill("C");
  await expect(page.getByLabel("自动匹配数据源格式")).not.toBeChecked();
});

for(const [target,size] of [["venu445mm","45mm"],["venu441mm","41mm"]])test(`source formatting SDK ${target}`,async({request})=>{
 test.skip(process.env.GFC_TEST_SDK!=="1","Explicit SDK test");test.setTimeout(130000);const p=project("SourceFormatSDK",true);p.target=target;p.deviceSize=size;const l={...layer("metric"),source:"steps",autoSourceFormat:true,metricDecoration:false,groupThousands:true,precision:2};p.layers=[l];p.controls=[{id:"source",label:"Source",type:"dataSource",default:"steps",options:["steps","temperature","distance","heartRate"],targets:[{layerId:l.id,property:"source"}]}];const form=new FormData();form.append("project",JSON.stringify({projectId:p.id,appId:p.appId,target,revision:p.revision,projectName:p.name}));for(const f of localGenerate(p))form.append("files",new Blob([f.content]),f.path);const r=await fetch(process.env.GFC_TEST_URL+"/api/builds",{method:"POST",body:form});expect(r.status).toBe(202);const job=await r.json();const headers=job.accessToken?{Authorization:"Bearer "+job.accessToken}:{};await expect.poll(async()=>{const state=await(await request.get(`/api/builds/${job.buildId}`,{headers})).json();if(state.status==="failed")throw Error("SDK compilation failed");return state.status;},{timeout:110000,intervals:[1000]}).toBe("succeeded");
});
