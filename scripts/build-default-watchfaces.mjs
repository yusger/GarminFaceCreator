import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hash = (b) => createHash("sha256").update(b).digest("hex");
const read = async (p) => readFile(resolve(root, p));
const put = async (p, b) => {
  const path = resolve(root, p);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, b);
};
const json = (b) => JSON.parse(b.toString("utf8"));
const safe = (p) => {
  if (
    typeof p !== "string" ||
    !p ||
    p.startsWith("/") ||
    p.includes("\\") ||
    p.split("/").some((s) => s === ".." || s === "." || !s) ||
    p.includes(":")
  )
    throw Error("Unsafe package path: " + p);
  return p;
};
export async function buildDefaultWatchfaces() {
  const registry = [],
    ids = new Set(),
    apps = new Set();
  for (const entry of await readdir(resolve(root, "resources/default-watchfaces"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name,
      dir = "resources/default-watchfaces/" + slug,
      r = json(await read(dir + "/reference.json")),
      p = json(await read(dir + "/design.json"));
    if (
      r.format !== 1 ||
      r.slug !== slug ||
      !["self", "community"].includes(r.authorship) ||
      !["native", "deterministic"].includes(r.generation?.mode) ||
      !/^[-a-z0-9]+$/.test(slug)
    )
      throw Error("Invalid descriptor: " + slug);
    if (
      p.id !== r.identity.id ||
      p.name !== r.identity.name ||
      p.appId !== r.identity.appId ||
      ids.has(p.id) ||
      apps.has(p.appId)
    )
      throw Error("Invalid/duplicate identity: " + slug);
    if (
      r.attribution.id !== p.id ||
      r.attribution.name !== p.name ||
      r.attribution.template !== slug
    )
      throw Error("Attribution identity mismatch: " + slug);
    ids.add(p.id);
    apps.add(p.appId);
    p.files = await Promise.all(
      r.codeFiles.map(async (path) => ({
        path: safe(path),
        content: (await read(dir + "/" + safe(path))).toString("utf8"),
      })),
    );
    const publicDir = "frontend/public/default-watchfaces/" + slug,
      base = "/default-watchfaces/" + slug;
    const images = [],
      binaryAssets = [];
    for (const a of r.images) {
      const bytes = await read(dir + "/" + safe(a.file));
      if (hash(bytes) !== a.sha256)
        throw Error("Asset hash mismatch: " + slug + "/" + a.file);
      const l = p.layers.find((l) => l.id === a.layerId);
      if (!l || l.kind !== "image") throw Error("Missing image layer: " + slug);
      await put(publicDir + "/" + a.file, bytes);
      images.push({ ...a, path: base + "/" + a.file });
      l.image = "data:" + a.mime + ";base64," + bytes.toString("base64");
    }
    p.assets = [];
    for (const a of r.binaryAssets) {
      const bytes = await read(dir + "/" + safe(a.file));
      if (hash(bytes) !== a.sha256) throw Error("Binary hash mismatch");
      safe(a.path);
      await put(publicDir + "/" + a.file, bytes);
      binaryAssets.push({ ...a, url: base + "/" + a.file });
      p.assets.push({
        id: a.id,
        path: a.path,
        data: "data:" + a.mime + ";base64," + bytes.toString("base64"),
      });
    }
    for (const a of r.fonts || []) {
      const bytes = await read(dir + "/" + safe(a.file));
      if (hash(bytes) !== a.sha256) throw Error("Font hash mismatch");
      await put("frontend/public/fonts/" + safe(a.publishName), bytes);
    }
    if (r.generation.mode === "deterministic") {
      const { localGenerate } =
        await import("../frontend/src/localGenerator.ts");
      p.files = [
        ...localGenerate(p),
        ...p.files.filter((f) => f.path.endsWith(".fnt")),
      ];
      p.codeRevision = p.revision;
      for (const f of p.files) await put(dir + "/" + safe(f.path), f.content);
      r.codeFiles = p.files.map((f) => f.path);
      await put(dir + "/reference.json", JSON.stringify(r, null, 2) + "\n");
    }
    await put(
      "frontend/public/templates/" + slug + ".json",
      JSON.stringify(p) + "\n",
    );
    const packed = structuredClone(p);
    for (const l of packed.layers) delete l.image;
    delete packed.assets;
    const bundle = { format: 1, project: packed, images, binaryAssets };
    await put(publicDir + "/project.json", JSON.stringify(bundle) + "\n");
    for (const n of r.notices) {
      if (n.publishName.includes("/") || n.publishName.includes("\\"))
        throw Error("Invalid notice name");
      await put(
        "frontend/public/reference-notices/" + safe(n.publishName),
        await read(dir + "/" + safe(n.file)),
      );
    }
    if (slug === "pulsemaniac")
      for (const name of ["NOTICE.md", "PROMPTS.md"])
        await put(
          "frontend/public/pulsemaniac/" + name,
          await read(dir + "/notices/PulseManiac-" + name),
        );
    const ref = {
      ...r.attribution,
      authorship: r.authorship,
      generation: r.generation,
      owned: r.authorship === "self" && !r.attribution.legacy,
      bundlePath: base + "/project.json",
      files: r.notices.map((n) => n.publishName),
    };
    registry.push(ref);
    if (slug === "pulsemaniac") {
      const aliases = [];
      for (const a of r.images) {
        const l = p.layers.find((l) => l.id === a.layerId),
          name =
            l.assetId === "pulse-background-v1"
              ? "background.png"
              : a.file
                  .split("/")
                  .pop()
                  .replace(/^pulse-/, "")
                  .replace(/-v[0-9]+/, "");
        const path = "/pulsemaniac/" + name;
        await put("frontend/public" + path, await read(dir + "/" + a.file));
        aliases.push({ ...a, path });
      }
      await put(
        "frontend/public/pulsemaniac/project.json",
        JSON.stringify({ ...bundle, images: aliases }) + "\n",
      );
    }
  }
  registry.sort((a, b) => a.id.localeCompare(b.id));
  await put(
    "frontend/src/referenceAttribution.json",
    JSON.stringify(registry, null, 2) + "\n",
  );
  console.log("Default watchface packages:", registry.length);
}
await buildDefaultWatchfaces();
