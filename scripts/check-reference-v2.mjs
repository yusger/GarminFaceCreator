// Read-only directory validator. No extraction, code execution, publication or model call.
import { readFile, lstat, realpath, readdir } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  validateV2Manifest,
  validateReleaseV2,
  validateReleaseCases,
} from "./reference-release-v2.mjs";
export async function checkReferenceV2(directory) {
  if (!directory) throw Error("Pass an explicit unpacked package directory");
  const requested = resolve(directory);
  if ((await lstat(requested)).isSymbolicLink())
    throw Error("Linked package root not allowed");
  const dir = await realpath(requested),
    loaded = new Map();
  let total = 0;
  const file = async (name) => {
    if (
      typeof name !== "string" ||
      !name ||
      !/^[A-Za-z0-9_./-]+$/.test(name) ||
      name.startsWith("/") ||
      name.split("/").some((p) => !p || p === "." || p === "..")
    )
      throw Error("Unsafe package path");
    if (loaded.has(name)) return loaded.get(name);
    let cursor = dir;
    for (const part of name.split("/")) {
      cursor = join(cursor, part);
      if ((await lstat(cursor)).isSymbolicLink())
        throw Error("Linked resource not allowed");
    }
    const path = await realpath(cursor),
      stat = await lstat(path);
    if (
      !path.startsWith(dir + sep) ||
      !stat.isFile() ||
      stat.size < 1 ||
      stat.size > 8 * 1024 * 1024
    )
      throw Error("Invalid package file");
    total += stat.size;
    if (total > 25 * 1024 * 1024) throw Error("Package exceeds 25MiB");
    const bytes = await readFile(path);
    loaded.set(name, bytes);
    return bytes;
  };
  const manifest = JSON.parse((await file("publish.json")).toString("utf8"));
  validateV2Manifest(manifest);
  // Structural manifest gate before accessing its supplied inventory.
  const shape = JSON.parse((await file("design.json")).toString("utf8"));
  const names = new Set(),
    roles = new Map();
  if (!Array.isArray(manifest.files) || manifest.files.length > 100)
    throw Error("Invalid inventory");
  for (const f of manifest.files) {
    if (
      typeof f.path !== "string" ||
      names.has(f.path.toLowerCase()) ||
      f.path.toLowerCase() === "publish.json"
    )
      throw Error("Duplicate inventory");
    names.add(f.path.toLowerCase());
    roles.set(f.path, f.role);
    const bytes = await file(f.path);
    if (
      bytes.length !== f.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== f.sha256
    )
      throw Error("Inventory fingerprint mismatch: " + f.path);
  }
  const actual = [];
  async function walk(path, prefix = "") {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isSymbolicLink()) throw Error("Linked package entry");
      if (entry.isDirectory()) await walk(join(path, entry.name), name + "/");
      else {
        actual.push(name);
        if (actual.length > 101) throw Error("Too many package entries");
      }
    }
  }
  await walk(dir);
  if (
    actual.length !== names.size + 1 ||
    actual.some((n) => n !== "publish.json" && !names.has(n.toLowerCase()))
  )
    throw Error("Undeclared package file");
  for (const [name, role] of [
    ["design.json", "design"],
    ["cases.json", "cases"],
    [manifest.origin?.licenseFile, "notice"],
    [manifest.previews?.active, "preview"],
    [manifest.previews?.aod, "preview"],
  ])
    if (roles.get(name) !== role)
      throw Error("Missing role in inventory: " + role);
  for (const name of Object.values(manifest.previews || {})) {
    const bytes = await file(name),
      pixels = shape.target === "venu441mm" ? 390 : 454;
    if (
      bytes.length < 24 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(16) !== pixels ||
      bytes.readUInt32BE(20) !== pixels
    )
      throw Error("Preview target dimensions mismatch");
  }
  const images = new Map();
  for (const b of manifest.bindings || []) {
    if (
      roles.get(b.file) !== "image" ||
      b.noticeFiles.some((n) => roles.get(n) !== "notice")
    )
      throw Error("Missing image notice or inventory role");
    const bytes = await file(b.file);
    if (
      bytes.length < 24 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(16) < 1 ||
      bytes.readUInt32BE(20) < 1 ||
      bytes.readUInt32BE(16) > 2048 ||
      bytes.readUInt32BE(20) > 2048
    )
      throw Error("Invalid image dimensions");
    images.set(b.layerId, "data:image/png;base64," + bytes.toString("base64"));
  }
  const validated = validateReleaseV2(manifest, shape, images),
    cases = validateReleaseCases(
      validated.project,
      JSON.parse((await file("cases.json")).toString("utf8")),
    );
  return {
    profile: manifest.generation.profile,
    projectSchemaVersion: shape.schemaVersion,
    target: shape.target,
    inventoryFiles: names.size,
    totalBytes: total,
    sourceFiles: validated.files.length,
    ...cases,
    diagnostics: validated.diagnostics,
    publication: "not performed",
    sdk: "not run",
    simulator: "not run",
    hardware: "unverified",
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(await checkReferenceV2(process.argv[2]), null, 2));
