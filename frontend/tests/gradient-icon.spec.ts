import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
function unzip(bytes: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18),
      n = bytes.readUInt16LE(offset + 26),
      e = bytes.readUInt16LE(offset + 28),
      start = offset + 30 + n + e;
    files.set(
      bytes.subarray(offset + 30, offset + 30 + n).toString(),
      bytes.subarray(start, start + size),
    );
    offset = start + size;
  }
  return files;
}
test("official static gradient survives browser PNG source export and native compilation", async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  await page.goto("/");
  page.on("dialog", (d) => d.accept("Gradient Icons"));
  await page.getByRole("button", { name: "空白画布", exact: false }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await page.getByLabel("素材分类").selectOption("meteocons");
  await page
    .getByRole("button", { name: "插入素材 晴天 · fill", exact: true })
    .click();
  await page.getByLabel("宽度", { exact: true }).fill("96");
  await page.getByLabel("高度", { exact: true }).fill("96");
  await page.getByLabel("高度", { exact: true }).blur();
  await expect
    .poll(async () =>
      decodeURIComponent(
        (await page.locator("svg.watch image").getAttribute("href")) || "",
      ),
    )
    .toContain("linearGradient");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
    .click();
  const files = unzip(await readFile((await (await pending).path())!));
  const pngs = [...files].filter(
    ([path]) => path.startsWith("assets/") && path.endsWith(".png"),
  );
  expect(pngs).toHaveLength(1);
  const colors = await page.evaluate(async (base64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + base64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data,
      colors = new Set<string>();
    let transparent = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) transparent++;
      else colors.add([data[i], data[i + 1], data[i + 2]].join(","));
    }
    return {
      colors: colors.size,
      transparent,
      top: [
        ...ctx.getImageData(
          Math.round(c.width / 2),
          Math.round(c.height * 0.4),
          1,
          1,
        ).data,
      ],
      bottom: [
        ...ctx.getImageData(
          Math.round(c.width / 2),
          Math.round(c.height * 0.6),
          1,
          1,
        ).data,
      ],
      corner: ctx.getImageData(0, 0, 1, 1).data[3],
    };
  }, pngs[0][1].toString("base64"));
  expect(colors.top[3]).toBe(255);
  expect(colors.bottom[3]).toBe(255);
  expect(colors.top[1]).toBeGreaterThan(colors.bottom[1]);
  expect(colors.corner).toBe(0);
  expect(colors.transparent).toBeGreaterThan(100);
  expect(files.has("licenses/Meteocons-LICENSE.txt")).toBe(true);
  const meta = JSON.parse(files.get("gfc-export.json")!.toString());
  expect(meta.usedIcons).toHaveLength(1);
  expect(meta.usedIcons[0].style).toBe("fill");
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: meta.projectId,
      appId: meta.appId,
      target: meta.target,
      revision: meta.codeRevision,
      projectName: "GradientIcons",
    }),
  );
  for (const [path, data] of files)
    if (
      /^(manifest.xml|monkey.jungle|source\/|resources\/|assets\/)/.test(path)
    )
      form.append("files", new Blob([data]), path);
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
      { timeout: 110000, intervals: [1000] },
    )
    .toBe("succeeded");
  const state = await (await request.get("/api/builds/" + job.buildId)).json();
  if (process.env.GFC_TEST_ARTIFACT_DIR) {
    await mkdir(process.env.GFC_TEST_ARTIFACT_DIR, { recursive: true });
    await writeFile(
      join(process.env.GFC_TEST_ARTIFACT_DIR, "GradientIcons.prg"),
      await (await request.get(state.artifacts[0].url)).body(),
    );
  }
});
