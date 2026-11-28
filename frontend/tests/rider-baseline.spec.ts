import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { validateProject } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { expandWidgets } from "../src/compound";
const dir = process.env.GFC_RIDER_FIXTURES;
for (const id of ["02", "05"])
  for (const [target, pixels] of [
    ["venu445mm", 454],
    ["venu441mm", 390],
  ] as const)
    test(`Rider editable baseline ${id} ${target}`, async ({ page }) => {
      test.skip(
        !dir,
        "Local original-source fixtures only; not published default designs",
      );
      test.setTimeout(150000);
      const p = validateProject(
          JSON.parse(
            await readFile(join(dir!, `rider${id}-${target}.json`), "utf8"),
          ),
        ),
        audit = JSON.parse(
          await readFile(join(dir!, `rider${id}-audit.json`), "utf8"),
        );
      expect(p.layers.some((l) => l.kind === "image")).toBe(false);
      expect(() => localGenerate(p)).not.toThrow();
      const layers = expandWidgets(p).layers;
      expect(
        layers
          .filter((l) => l.kind === "metric")
          .map((l) => l.source)
          .sort(),
      ).toEqual(["battery", "calories", "heartRate", "steps"]);
      if (id === "02")
        expect(layers.filter((l) => l.kind === "hand")).toHaveLength(3);
      else expect(layers.filter((l) => l.kind === "polygon")).toHaveLength(6);
      page.on("dialog", (d) => d.accept());
      await page.goto("/");
      await page
        .locator('input[hidden][accept=".json"]')
        .setInputFiles({
          name: `rider${id}.json`,
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(p)),
        });
      await expect(page.locator(".layer-row")).toHaveCount(p.layers.length);
      await page.getByRole("button", { name: "预览", exact: true }).click();
      await page.getByLabel("实时模拟", { exact: true }).uncheck();
      await page
        .getByLabel("模拟时间", { exact: true })
        .fill(audit.fixedPreview.time);
      await page
        .getByLabel("模拟秒数", { exact: true })
        .evaluate((el, value) => {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )!.set!;
          setter.call(el, String(value));
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, audit.fixedPreview.seconds);
      for (const [label, value] of [
        ["心率", 72],
        ["步数", 8420],
        ["电量", 78],
      ] as const)
        await page
          .getByLabel("模拟" + label, { exact: true })
          .fill(String(value));
      for (const mode of ["active", "aod"]) {
        const wait = page.waitForEvent("download");
        await page
          .getByRole("button", {
            name: mode === "active" ? "下载亮屏盘面" : "下载息屏盘面",
            exact: true,
          })
          .click();
        const download = await wait;
        await download.saveAs(
          join(dir!, `browser-${id}-${pixels}-${mode}.png`),
        );
        const metaWait = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "下载截图参数", exact: true })
          .click();
        const metadata = JSON.parse(
          await readFile((await (await metaWait).path())!, "utf8"),
        );
        expect(metadata.width).toBe(pixels);
        expect(metadata.rendererVersion).toBe("browser-capture-4");
        expect(metadata.preview.steps).toBe(8420);
        expect(metadata.preview.time).toBe(audit.fixedPreview.time);
        expect(metadata.preview.seconds).toBe(mode === "aod" ? 0 : audit.fixedPreview.seconds);
        await writeFile(
          join(dir!, `browser-${id}-${pixels}-${mode}.json`),
          JSON.stringify(metadata, null, 2),
        );
      }
      if (process.env.GFC_RIDER_SOURCE) {
        for (const mode of ["normal", "aod"]) {
          const svg = await readFile(
            join(process.env.GFC_RIDER_SOURCE, "faces", `${id}-${mode}.svg`),
            "utf8",
          );
          const data = await page.evaluate(
            async ({ svg, pixels }) => {
              const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
              doc.documentElement.setAttribute("width", String(pixels));
              doc.documentElement.setAttribute("height", String(pixels));
              const image = new Image();
              image.src =
                "data:image/svg+xml;base64," +
                btoa(
                  unescape(
                    encodeURIComponent(
                      new XMLSerializer().serializeToString(doc),
                    ),
                  ),
                );
              await image.decode();
              const c = document.createElement("canvas");
              c.width = c.height = pixels;
              c.getContext("2d")!.drawImage(image, 0, 0);
              return c.toDataURL("image/png").split(",")[1];
            },
            { svg, pixels },
          );
          await writeFile(
            join(
              dir!,
              `original-${id}-${pixels}-${mode === "normal" ? "active" : "aod"}.png`,
            ),
            Buffer.from(data, "base64"),
          );
        }
      }
      if (process.env.GFC_TEST_SDK !== "1") return;
      await page.getByRole("button", { name: "关闭预览", exact: true }).click();
      await page
        .getByRole("button", { name: "本地生成（试验）", exact: true })
        .click();
      await page
        .getByRole("button", { name: "应用生成结果", exact: true })
        .click();
      let submitted: Buffer | undefined,
        type = "";
      await page.route("**/api/builds", async (route) => {
        submitted = route.request().postDataBuffer()!;
        type = route.request().headers()["content-type"];
        await route.continue();
      });
      await page
        .getByRole("button", { name: "编译", exact: true })
        .first()
        .click();
      await expect(page.locator(".build-drawer pre")).toContainText(
        "succeeded",
        { timeout: 110000 },
      );
      expect(submitted).toBeDefined();
      const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(type)!;
      const nameAt = submitted!.indexOf(
        Buffer.from('filename="source/App.mc"'),
      );
      expect(nameAt).toBeGreaterThan(-1);
      const start = submitted!.indexOf(Buffer.from("\r\n\r\n"), nameAt) + 4,
        end = submitted!.indexOf(
          Buffer.from("\r\n--" + (boundary[1] || boundary[2])),
          start,
        );
      expect(end).toBeGreaterThan(start);
      await writeFile(join(dir!, `submitted-${id}-${target}.bin`), submitted!);
      await writeFile(
        join(dir!, `submitted-${id}-${target}.json`),
        JSON.stringify(
          {
            contentType: type,
            sourceOffset: start,
            sourceLength: end - start,
            sourceSha256: createHash("sha256")
              .update(submitted!.subarray(start, end))
              .digest("hex"),
            target,
            pixels,
            fixedPreview: audit.fixedPreview,
            notPublished: true,
          },
          null,
          2,
        ),
      );
    });
