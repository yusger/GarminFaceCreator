import {missingGlyphs} from "../frontend/src/fontLibrary.ts";
// Maintainer-only canonical bitmap/font resource creation. Run from repository root.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { pathToFileURL } from "node:url";
const root = process.cwd(),
  require = createRequire(root + "/package.json"),
  { chromium } = require("@playwright/test");
const { chalkPlans } = await import(
  pathToFileURL(root + "/frontend/src/chalkFonts.ts")
);
const dir = root + "/resources/default-watchfaces/pulsemaniac",
  p = JSON.parse(await readFile(dir + "/design.json", "utf8")),
  r = JSON.parse(await readFile(dir + "/reference.json", "utf8"));
const source = stripTypeScriptTypes(
  (await readFile(root + "/frontend/src/chalkAtlas.ts", "utf8")).replace(
    "export async function",
    "async function",
  ),
);
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
await page.goto("about:blank");
await page.addScriptTag({ content: source });
const hash = (b) => createHash("sha256").update(b).digest("hex");
try {
  for (const l of p.layers.filter(
    (l) => l.kind === "image" && l.assetId?.endsWith("-heart"),
  )) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="116" height="106" viewBox="0 0 116 106"><path d="M58 96 C44 84 6 58 6 30 C6 5 41 0 58 23 C76 0 110 5 110 30 C110 58 72 84 58 96 Z" fill="#101010" stroke="${l.color}" stroke-width="5" stroke-linejoin="round"/></svg>`;
    const data = await page.evaluate(async (svg) => {
      const img = new Image();
      img.src = "data:image/svg+xml;base64," + btoa(svg);
      await img.decode();
      const c = document.createElement("canvas");
      c.width = 116;
      c.height = 106;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL();
    }, svg);
    const a = r.images.find((a) => a.layerId === l.id),
      bytes = Buffer.from(data.split(",")[1], "base64");
    await writeFile(dir + "/" + a.file, bytes);
    a.sha256 = hash(bytes);
  }
  r.binaryAssets = r.binaryAssets.filter(
    (a) => !a.path.startsWith("resources/fonts/GfcChalk"),
  );
  r.codeFiles = r.codeFiles.filter((a) => !a.endsWith(".fnt"));
  for (const plan of chalkPlans(p)) {
    const bytes = await readFile(dir + "/fonts/" + plan.font);
    const missing=missingGlyphs(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),plan.glyphs);if(missing.length)throw Error("Font missing required glyphs: "+missing.join(" "));
    const atlas = await page.evaluate(
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
    await writeFile(
      dir + "/resources/fonts/" + plan.id + ".fnt",
      atlas.content,
    );
    r.codeFiles.push("resources/fonts/" + plan.id + ".fnt");
    const png = Buffer.from(atlas.data.split(",")[1], "base64"),
      path = "resources/fonts/" + plan.id + ".png";
    await writeFile(dir + "/" + path, png);
    r.binaryAssets.push({
      id: plan.id,
      file: path,
      path,
      mime: "image/png",
      sha256: hash(png),
    });
  }
  await writeFile(dir + "/reference.json", JSON.stringify(r, null, 2) + "\n");
  console.log(
    "Created hearts and",
    chalkPlans(p).length,
    "native font atlases",
  );
} finally {
  await browser.close();
}
