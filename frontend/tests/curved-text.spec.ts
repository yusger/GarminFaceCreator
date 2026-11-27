import { test, expect } from "@playwright/test";
import { curvedLayout } from "../src/curvedTextLayout";
import { layer, project, validateProject } from "../src/domain";
import { localLayerDiagnostics } from "../src/capabilities";
import { localGenerate } from "../src/localGenerator";
import { applyChat } from "../src/designChat";
test("curved text geometry has defined direction, anchor, spacing and native limits", () => {
  const l = {
    ...layer("arcText"),
    w: 250,
    h: 250,
    arcRadius: 0.4,
    arcSpacing: 0,
    text: "AB",
  };
  const top = curvedLayout(l, [20, 20]);
  expect(top[0].x).toBeCloseTo(115.0166583);
  expect(top[0].y).toBeCloseTo(25.4995835);
  expect(top[1].x).toBeCloseTo(134.9833417);
  const bottom = curvedLayout(
    { ...l, arcStartAngle: 180, arcDirection: "counterclockwise" },
    [20, 20],
  );
  expect(bottom[0].x).toBeCloseTo(top[0].x);
  expect(bottom[0].y).toBeCloseTo(224.5004165);
  expect(bottom[0].rotation).toBeCloseTo(365.7295779);
  expect(curvedLayout({ ...l, arcSpacing: 10 }, [20, 20])[0].x).toBeLessThan(
    top[0].x,
  );
  const p = project("Curved", true);
  p.layers = [l];
  validateProject(p);
  const files = localGenerate(p);
  expect(files.find((f) => f.path === "manifest.xml")!.content).toContain(
    'minApiLevel="5.1.0"',
  );
  expect(files.find((f) => f.path === "source/App.mc")!.content).toContain(
    "dc.drawAngledText",
  );
  expect(() => localGenerate({ ...p, target: "venu3" })).toThrow(/Venu4/);
  expect(localLayerDiagnostics({ ...l, text: "中文" })[0].code).toBe(
    "LOCAL_ARC_TEXT_STYLE_UNSUPPORTED",
  );
  expect(
    localLayerDiagnostics({ ...l, arcRadius: 0.05, size: 80 })[0].code,
  ).toBe("LOCAL_ARC_TEXT_BUDGET");
  expect(() =>
    validateProject({ ...p, layers: [{ ...l, arcRadius: NaN }] }),
  ).toThrow(/曲线/);
  expect(() =>
    validateProject({ ...p, layers: [{ ...l, text: "A".repeat(81) }] }),
  ).toThrow(/80/);
  expect(() =>
    localGenerate({
      ...p,
      layers: Array.from({ length: 9 }, (_, i) => ({ ...l, id: "c" + i })),
    }),
  ).toThrow(/最多8/);
  const next = applyChat(
    p,
    JSON.stringify({
      message: "ok",
      operations: [
        {
          type: "update",
          id: l.id,
          patch: {
            arcDirection: "counterclockwise",
            arcStartAngle: 180,
            arcSpacing: 2,
          },
        },
      ],
    }),
  ).project;
  expect(next.layers[0].arcStartAngle).toBe(180);
  expect(p.layers[0].arcStartAngle).toBe(0);
});
test("curved text is a single editable layer with direction and capture support", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("CurvedUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "曲线文字", exact: true }).click();
  await page.getByLabel("曲线文字内容").fill("CURVED LABEL");
  await expect(page.locator("[data-curved-text] text")).toHaveCount(12);
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await page.getByLabel("曲线方向").selectOption("counterclockwise");
  await page.getByLabel("曲线起始角").fill("180");
  await page.getByLabel("曲线字距").fill("2");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载亮屏盘面", exact: true }).click();
  expect((await wait).suggestedFilename()).toMatch(/png$/);
  await expect(page.getByRole("status")).toContainText("系统字体");
});

for(const size of [454,390])test(`native curved glyph baseline is upright ${size}`,async({page})=>{
 test.skip(!process.env.GFC_TEST_NATIVE_CAPTURE_DIR,"Explicit isolated SDK capture input only");
 const {readFile}=await import("node:fs/promises"),{join}=await import("node:path");const bytes=await readFile(join(process.env.GFC_TEST_NATIVE_CAPTURE_DIR!,`native-curved-${size}.png`));
 const box=await page.evaluate(async({data,size})=>{const image=new Image();image.src="data:image/png;base64,"+data;await image.decode();if(image.width!==size||image.height!==size)throw Error("Wrong capture device pixels");const c=document.createElement("canvas");c.width=size;c.height=size;const ctx=c.getContext("2d")!;ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,size,size).data,scale=size/454;let x0=size,y0=size,x1=-1,y1=-1,count=0;for(let y=Math.floor(130*scale);y<180*scale;y++)for(let x=Math.floor(200*scale);x<254*scale;x++){const i=(y*size+x)*4;if(rgba[i]>200&&rgba[i+1]<150&&rgba[i+2]<150){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;}}return {w:x1-x0+1,h:y1-y0+1,count};},{data:bytes.toString("base64"),size});
 expect(box.count).toBeGreaterThan(20);expect(box.h).toBeGreaterThan(box.w);
});
