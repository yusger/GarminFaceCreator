import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname, basename } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  out = resolve(root, "frontend/public/reference-notices"),
  hash = (data) => createHash("sha256").update(data).digest("hex");
const refs = JSON.parse(
  await readFile(
    resolve(root, "frontend/src/referenceAttribution.json"),
    "utf8",
  ),
);
await mkdir(resolve(out, "generator-sources"), { recursive: true });
const bundles = [];
for (const ref of refs) {
  const legacyIds = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
  ];
  if (ref.legacy && !legacyIds.includes(ref.id))
    throw Error(
      "Only existing reference packages may retain legacy uncertainty",
    );
  if (
    !ref.legacy &&
    (!/^[a-f0-9]{40}$/.test(ref.upstreamCommit || "") ||
      ref.verifiedLicense !== true)
  )
    throw Error(
      "New references require a pinned upstream commit and verified license",
    );

  const path = "/templates/" + ref.template + ".json",
    data = await readFile(resolve(root, "frontend/public" + path));
  const p = JSON.parse(data);
  if (p.id !== ref.id || p.name !== ref.name)
    throw Error("Reference identity mismatch: " + ref.template);
  for (const file of ref.files) await readFile(resolve(out, file));
  bundles.push({ ...ref, path, sha256: hash(data) });
}
const generators = [];
for (const sourceFile of [
  "frontend/src/localGenerator.ts",
  "frontend/src/weatherIcons.ts",
]) {
  const text = (await readFile(resolve(root, sourceFile), "utf8")).replaceAll(
    "\r\n",
    "\n",
  );
  const version = sourceFile.endsWith("localGenerator.ts")
    ? text.match(/LOCAL_GENERATOR_VERSION\s*=\s*"([^"]+)"/)?.[1]
    : text.match(/fixed icon adapter (icons-[0-9]+)/)?.[1];
  if (!version) throw Error("Missing generator version");
  const path = "/reference-notices/generator-sources/" + basename(sourceFile);
  await writeFile(resolve(root, "frontend/public" + path), text);
  generators.push({
    sourceFile,
    path,
    version,
    sha256: hash(text),
    license: "GPL-3.0-or-later",
    scope:
      "Template source context; exported Monkey C files are the complete native build input",
  });
}
await writeFile(
  resolve(out, "provenance.json"),
  JSON.stringify(
    {
      format: 1,
      projectSource: "https://github.com/yusger/GarminFaceCreator",
      licensePath: "/reference-notices/repository-LICENSE.txt",
      bundles,
      generators,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Attribution snapshots:",
  bundles.length,
  "bundles;",
  generators.length,
  "generator sources",
);
