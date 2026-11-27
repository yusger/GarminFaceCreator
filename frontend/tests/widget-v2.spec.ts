import {test,expect} from "@playwright/test";
import {project,validateProject} from "../src/domain";
import {insertWidget,cloneCompound} from "../src/widgets";
import {expandedChildren} from "../src/compound";
import {localGenerate} from "../src/localGenerator";
import {validPolygon} from "../src/geometry";
test("v2 geometry remains one editable object when scaled and copied",()=>{
 const p=insertWidget(project("V2",true),"chamfer-dial"),root=p.layers[0];validateProject(p);expect(p.layers).toHaveLength(1);expect(root.compound!.version).toBe(2);
 const scaled=expandedChildren({...root,w:160,h:160},p);expect(scaled).toHaveLength(4);expect(validPolygon(scaled.find(l=>l.kind==="polygon")!.polygonPoints)).toBe(true);
 const copy=cloneCompound(root);expect(copy.compound!.layers.some(l=>root.compound!.layers.some(c=>c.id===l.id))).toBe(false);
 const code=localGenerate(p).find(f=>f.path==="source/App.mc")!.content;expect(code).toContain("dc.drawAngledText");expect(code).toContain("dataBattery".toLowerCase());
});
test("v2 library insertion retains a single parent and original presets",async({page})=>{
 page.on("dialog",d=>d.accept("V2UI"));await page.goto("/");await page.getByRole("button",{name:/^空白画布/}).click();await page.getByRole("button",{name:"创建项目",exact:true}).click();await page.getByRole("button",{name:"素材",exact:true}).click();await page.getByText("自定义控件",{exact:true}).click();await page.getByLabel("自定义控件样式").selectOption("chamfer-dial");await page.getByRole("button",{name:"添加控件",exact:true}).click();await expect(page.locator(".layer-row")).toHaveCount(1);await expect(page.getByLabel("复合控件名称")).toHaveValue("切角电量仪表 #1");
});
for (const [target, size] of [
  ["venu445mm", "45mm"],
  ["venu441mm", "41mm"],
])
  test(`v2 geometry SDK ${target}`, async ({ request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK test");
    test.setTimeout(130000);
    let p = project("InstrumentsSDK", true);
    p.target = target;
    p.deviceSize = size;
    p = insertWidget(p, "chamfer-dial");
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
