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
  "frontend/src/wordTime.ts",
]) {
  const text = (await readFile(resolve(root, sourceFile), "utf8")).replaceAll(
    "\r\n",
    "\n",
  );
  const version = sourceFile.endsWith("localGenerator.ts")
    ? text.match(/LOCAL_GENERATOR_VERSION\s*=\s*"([^"]+)"/)?.[1]
    : sourceFile.endsWith("wordTime.ts")
      ? text.match(/WORD_TIME_VERSION\s*=\s*"([^"]+)"/)?.[1]
      : text.match(/fixed icon adapter (icons-[0-9]+)/)?.[1];
  if (!version) throw Error("Missing generator version");
  const path = "/reference-notices/generator-sources/" + basename(sourceFile);
  await writeFile(resolve(root, "frontend/public" + path), text);
  generators.push({
    sourceFile,
    path,
    version,
    sha256: hash(text),
    license: sourceFile.endsWith("wordTime.ts")
      ? "GPL-3.0-or-later adapter; MIT locale phrases"
      : "GPL-3.0-or-later",
    scope:
      "Template source context; exported Monkey C files are the complete native build input",
  });
}
const wordLocaleFiles = [];
for (const [name, expected] of Object.entries({
  "AboutTime-LICENSE.txt":
    "00a2b29a7539568eb12ea2f79d0af7ce8e82fa40a59bde62ca0bae00c583dd18",
  "AboutTime-English-strings.xml":
    "5012c9504c589d529f4ac1ac6988bf5de2fbb53e32583e243196531f7b8b8c91",
  "AboutTime-Chinese-strings.xml":
    "a1a9580e8e590926c34b8de05a58b4ff6614d7e92fc3ebb759d1a20a667be891",
})) {
  const bytes = await readFile(resolve(out, name));
  if (hash(bytes) !== expected)
    throw Error("Pinned word-time source mismatch: " + name);
  wordLocaleFiles.push({
    path: "/reference-notices/" + name,
    sha256: expected,
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
      wordTimeLocale: {
        source: "https://github.com/samuelmr/garmin-abouttime",
        commit: "4fdf09bcf784ecf385b9dce546af3f277e13caa5",
        license: "MIT",
        files: wordLocaleFiles,
      },
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

await import("./update-research-docs.mjs");
