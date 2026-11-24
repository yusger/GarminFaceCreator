import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
function unzip(data: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (data.readUInt32LE(offset) === 0x04034b50) {
    const size = data.readUInt32LE(offset + 18),
      n = data.readUInt16LE(offset + 26),
      e = data.readUInt16LE(offset + 28),
      start = offset + 30 + n + e;
    files.set(
      data.subarray(offset + 30, offset + 30 + n).toString(),
      data.subarray(start, start + size),
    );
    offset = start + size;
  }
  return files;
}
test("static icons support SVG preview edits persistence and licensed native source export", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() =>
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([
        {
          id: "icon",
          name: "Icon test",
          url: "https://api.example.com/v1",
          model: "mock",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 8192,
        },
      ]),
    ),
  );
  await page.goto("/");
  page.on("dialog", (d) => d.accept("Library Icons"));
  await page.getByRole("button", { name: "空白画布", exact: false }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await page.getByLabel("搜索素材").fill("心率");
  await page
    .getByRole("button", { name: "插入素材 心率", exact: true })
    .click();
  await expect(page.getByLabel("图层名称", { exact: true })).toHaveValue(
    "心率",
  );
  await page.getByLabel("颜色", { exact: true }).fill("#ff0000");
  await page.getByLabel("图标线宽", { exact: true }).fill("3");
  await page.getByLabel("宽度", { exact: true }).fill("96");
  await page.getByLabel("宽度", { exact: true }).blur();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("64");
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("96");
  await expect(page.locator("svg.watch image")).toHaveAttribute(
    "href",
    /^data:image\/svg\+xml/,
  );
  await page.getByLabel("搜索素材").fill("");
  await page.getByLabel("素材分类").selectOption("meteocons");
  await page
    .getByRole("button", { name: "插入素材 晴天 · flat", exact: true })
    .click();
  await expect(page.locator("svg.watch image")).toHaveCount(2);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 Library Icons", exact: true })
    .click();
  await expect(page.locator("svg.watch image")).toHaveCount(2);
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      const body = route.request().postDataJSON();
      expect(JSON.stringify(body)).not.toContain("data:image/");
      const d = JSON.parse(body.messages[1].content).design,
        paths = d.layers.map((l: any) => l.asset);
      const files = [
        { path: "manifest.xml", content: d.requiredManifest },
        {
          path: "monkey.jungle",
          content:
            "project.manifest=manifest.xml\nbase.sourcePath=source\nbase.resourcePath=resources",
        },
        {
          path: "resources/strings/strings.xml",
          content: '<strings><string id="AppName">Icons</string></strings>',
        },
        {
          path: "resources/drawables/icon.svg",
          content:
            '<svg xmlns="http://www.w3.org/2000/svg" width="65" height="65"><circle cx="32" cy="32" r="20" fill="#ffffff"/></svg>',
        },
        {
          path: "resources/drawables/drawables.xml",
          content: `<drawables><bitmap id="LauncherIcon" filename="icon.svg"/><bitmap id="Icon0" filename="../../${paths[0]}"/><bitmap id="Icon1" filename="../../${paths[1]}"/></drawables>`,
        },
        {
          path: "source/App.mc",
          content:
            "import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics; class GeneratedApp extends Application.AppBase {function initialize(){AppBase.initialize();}function getInitialView(){return [new IconView()];}} class IconView extends WatchUi.WatchFace {function initialize(){WatchFace.initialize();}function onUpdate(dc as Graphics.Dc) as Void {dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();dc.drawBitmap(dc.getWidth()/2-100,dc.getHeight()/2-40,WatchUi.loadResource(Rez.Drawables.Icon0));dc.drawBitmap(dc.getWidth()/2+30,dc.getHeight()/2-40,WatchUi.loadResource(Rez.Drawables.Icon1));}}",
        },
      ];
      await route.fulfill({
        json: {
          choices: [{ message: { content: JSON.stringify({ files }) } }],
        },
      });
    },
  );
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await page.getByRole("button", { name: "审阅代码", exact: true }).click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
    .click();
  const files = unzip(await readFile((await (await pending).path())!));
  expect(files.has("licenses/Lucide-LICENSE.txt")).toBe(true);
  expect(files.has("licenses/Meteocons-LICENSE.txt")).toBe(true);
  expect(
    [...files.keys()].filter((p) => p.startsWith("source-assets/icons/")),
  ).toHaveLength(2);
  const pngs = [...files].filter(
    ([p]) => p.startsWith("assets/") && p.endsWith(".png"),
  );
  expect(pngs).toHaveLength(2);
  expect(pngs[0][1].readUInt32BE(16)).toBe(96);
  expect(pngs[0][1].readUInt32BE(20)).toBe(64);
  const pixels = await page.evaluate(
    async (encoded) => {
      const result = [];
      for (const base64 of encoded) {
        const img = new Image();
        img.src = "data:image/png;base64," + base64;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const a = ctx.getImageData(0, 0, c.width, c.height).data;
        let visible = 0,
          transparent = 0,
          red = 0;
        const colors = new Set<string>();
        for (let i = 0; i < a.length; i += 4) {
          if (a[i + 3] === 0) transparent++;
          else {
            visible++;
            colors.add([a[i], a[i + 1], a[i + 2]].join(","));
            if (a[i] > 200 && a[i + 1] < 80 && a[i + 2] < 80) red++;
          }
        }
        result.push({ visible, transparent, red, colors: colors.size });
      }
      return result;
    },
    pngs.map(([, data]) => data.toString("base64")),
  );
  expect(pixels[0].red).toBeGreaterThan(20);
  expect(pixels[0].transparent).toBeGreaterThan(20);
  expect(pixels[1].colors).toBeGreaterThan(6);

  const meta = JSON.parse(files.get("gfc-export.json")!.toString());
  expect(meta.usedIcons).toHaveLength(2);
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: meta.projectId,
      appId: meta.appId,
      target: meta.target,
      revision: meta.codeRevision,
      projectName: "LibraryIcons",
    }),
  );
  for (const [path, bytes] of files)
    if (
      /^(source\/|resources\/|assets\/|manifest.xml|monkey.jungle)/.test(path)
    )
      form.append("files", new Blob([bytes]), path);
  const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
    method: "POST",
    body: form,
  });
  expect(r.status).toBe(202);
  const job = await r.json();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/builds/" + job.buildId)).json()).status,
      { timeout: 130000, intervals: [1000] },
    )
    .toBe("succeeded");
  const state = await (await request.get("/api/builds/" + job.buildId)).json();
  if (process.env.GFC_TEST_ARTIFACT_DIR) {
    await mkdir(process.env.GFC_TEST_ARTIFACT_DIR, { recursive: true });
    await writeFile(
      join(process.env.GFC_TEST_ARTIFACT_DIR, "LibraryIcons.prg"),
      await (await request.get(state.artifacts[0].url)).body(),
    );
  }
});
