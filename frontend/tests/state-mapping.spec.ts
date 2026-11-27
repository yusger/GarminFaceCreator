import { binaryAssets } from "../src/assets";
import { png } from "../../backend/tests/image-fixture.mjs";
import { test, expect } from "@playwright/test";
import { layer, project, validateProject } from "../src/domain";
import {
  createStateGroup,
  setPartCondition,
  setPartColor,
  setPartImage,
} from "../src/stateMapping";
import { expandWidgets } from "../src/compound";
import { conditionVisible } from "../src/visibility";
import { localGenerate } from "../src/localGenerator";
for (const preset of ["heartRate", "battery"] as const)
  test(`state ranges are exclusive with valid zero and missing ${preset}`, () => {
    const p = project("States", true);
    p.layers = [
      { ...layer("rect"), x: 100, y: 100, w: 100, h: 100, aod: true },
    ];
    const before = JSON.stringify(p),
      q = createStateGroup(p, p.layers[0].id, preset);
    validateProject(q);
    expect(q.layers).toHaveLength(1);
    expect(q.layers[0].compound!.parts).toHaveLength(
      preset === "heartRate" ? 4 : 3,
    );
    const children = expandWidgets(q).layers;
    for (const value of preset === "heartRate"
      ? [1, 99, 100, 119, 120, 140, 141]
      : [0, 9, 10, 29, 30, 100])
      expect(
        children.filter((l) =>
          conditionVisible(l.visibility, { [preset]: value }),
        ),
      ).toHaveLength(1);
    for (const value of [undefined, NaN, preset === "battery" ? 101 : 0])
      expect(
        children.filter((l) =>
          conditionVisible(l.visibility, { [preset]: value }),
        ),
      ).toHaveLength(0);
    const root = q.layers[0],
      part = root.compound!.parts[0];
    const patch = setPartCondition(root, part.id, {
      source: "battery",
      min: 30,
    });
    expect(patch.compound!.layers[0].visibility!.source).toBe("battery");
    expect(
      setPartColor(root, part.id, "#FF0000").compound!.layers[0].color,
    ).toBe("#FF0000");
    expect(
      localGenerate(q).find((f) => f.path === "source/App.mc")!.content,
    ).toContain("data" + preset);
    expect(JSON.stringify(p)).toBe(before);
  });
test("state mapping keeps one object, allows internal conditions and survives undo", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("StatesUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "矩形", exact: true }).click();
  await page
    .getByRole("button", { name: "生成数据状态组", exact: true })
    .click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await expect(page.getByLabel("复合控件名称")).toHaveValue("矩形状态组");
  await page.getByText("数据状态映射", { exact: true }).click();
  await expect(page.getByLabel("状态映射部件").locator("option")).toHaveCount(
    4,
  );
  await page.getByLabel("状态映射部件").selectOption("state-1");
  await page.getByLabel("状态配色", { exact: true }).fill("#00FF00");
  await page
    .getByRole("button", { name: "应用所选状态配色", exact: true })
    .click();
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
});

test("replacing one state image keeps the others and allocates a distinct asset identity", () => {
  const p = project("Images", true),
    red = "data:image/png;base64," + png(255, 0, 0).toString("base64"),
    blue = "data:image/png;base64," + png(0, 0, 255).toString("base64");
  p.layers = [
    {
      ...layer("image"),
      image: red,
      assetId: "shared",
      x: 100,
      y: 100,
      w: 100,
      h: 100,
    },
  ];
  const q = createStateGroup(p, p.layers[0].id, "battery");
  expect(binaryAssets(q)).toHaveLength(1);
  const root = q.layers[0],
    part = root.compound!.parts[0];
  q.layers = [{ ...root, ...setPartImage(root, part.id, blue) }];
  validateProject(q);
  expect(binaryAssets(q)).toHaveLength(2);
  expect(
    q.layers[0].compound!.layers.filter((l) => l.image === red),
  ).toHaveLength(2);
});

for(const [target,size] of [["venu445mm","45mm"],["venu441mm","41mm"]])test(`state image SDK ${target}`,async({request})=>{
 test.skip(process.env.GFC_TEST_SDK!=="1","Explicit SDK test");test.setTimeout(130000);const p=project("StateImagesSDK",true);p.target=target;p.deviceSize=size;p.layers=[{...layer("image"),image:"data:image/png;base64,"+png(255,0,0).toString("base64"),x:100,y:100,w:100,h:100,aod:true}];const q=createStateGroup(p,p.layers[0].id,"heartRate"),root=q.layers[0];q.layers=[{...root,...setPartImage(root,root.compound!.parts[1].id,"data:image/png;base64,"+png(0,0,255).toString("base64"))}];const form=new FormData();form.append("project",JSON.stringify({projectId:q.id,appId:q.appId,target,revision:q.revision,projectName:q.name}));for(const f of localGenerate(q))form.append("files",new Blob([f.content]),f.path);for(const a of binaryAssets(q))form.append("files",new Blob([Buffer.from(a.data.split(",")[1],"base64")],{type:"image/png"}),a.path);const r=await fetch(process.env.GFC_TEST_URL+"/api/builds",{method:"POST",body:form});expect(r.status).toBe(202);const job=await r.json(),headers={Authorization:"Bearer "+job.accessToken};await expect.poll(async()=>{const state=await(await request.get(`/api/builds/${job.buildId}`,{headers})).json();if(state.status==="failed")throw Error("State SDK failed");return state.status;},{timeout:110000,intervals:[1000]}).toBe("succeeded");
});
