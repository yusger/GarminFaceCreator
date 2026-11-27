import {missingGlyphs} from "../frontend/src/fontLibrary.ts";
// Maintainer-only default font snapshot generation; normal builds use checked-in snapshots.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { stripTypeScriptTypes } from "node:module";
import { chromium } from "@playwright/test";
import { chalkPlans } from "../frontend/src/chalkFonts.ts";
const slug = process.argv[2];
if (!/^[-a-z0-9]+$/.test(slug || "")) throw Error("Pass a reference slug");
const dir = resolve("resources/default-watchfaces", slug),
  p = JSON.parse(await readFile(dir + "/design.json", "utf8")),
  r = JSON.parse(await readFile(dir + "/reference.json", "utf8"));
const source = stripTypeScriptTypes(
  (await readFile("frontend/src/chalkAtlas.ts", "utf8")).replace(
    "export async function",
    "async function",
  ),
);
const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  }),
  page = await browser.newPage();
await page.goto("about:blank");
await page.addScriptTag({ content: source });
try {
  r.codeFiles = r.codeFiles.filter((f) => !f.endsWith(".fnt"));
  r.binaryAssets = r.binaryAssets.filter(
    (a) => !a.path.startsWith("resources/fonts/Gfc"),
  );
  for (const plan of chalkPlans(p)) {
    const f = r.fonts.find((f) => f.publishName === plan.font);
    if (!f) throw Error("Missing font " + plan.font);
    const bytes = await readFile(dir + "/" + f.file),
      checked = missingGlyphs(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),plan.glyphs),
      atlas = checked.length ? (()=>{throw Error("Font missing required glyphs: "+checked.join(" "));})() : await page.evaluate(
        async ({ bytes, plan }) =>
          chalkAtlas(
            Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0)).buffer,
            plan.id,
            plan.size,
            plan.glyphs,
            plan.id + ".png",
          ),
        { bytes: bytes.toString("base64"), plan },
      );
    await mkdir(dir + "/resources/fonts", { recursive: true });
    const file = "resources/fonts/" + plan.id + ".fnt";
    await writeFile(dir + "/" + file, atlas.content);
    r.codeFiles.push(file);
    const data = Buffer.from(atlas.data.split(",")[1], "base64"),
      path = "resources/fonts/" + plan.id + ".png";
    await writeFile(dir + "/" + path, data);
    r.binaryAssets.push({
      id: plan.id,
      path,
      file: path,
      mime: "image/png",
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  }
  await writeFile(dir + "/reference.json", JSON.stringify(r, null, 2) + "\n");
  console.log("Font snapshots:", slug, chalkPlans(p).length);
} finally {
  await browser.close();
}
