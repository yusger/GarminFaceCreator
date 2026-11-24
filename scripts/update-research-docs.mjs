import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  out = resolve(root, "frontend/public/research/byod");
await mkdir(out, { recursive: true });
const digest = (b) => createHash("sha256").update(b).digest("hex");
const source = JSON.parse(
  await readFile(
    resolve(root, "docs/research/byod/source-review.json"),
    "utf8",
  ),
);
const records = [];
for (const [input, name] of [
  ["docs/byod-modular-layout.md", "layout-plan.md"],
  ["docs/research/byod/round-layout.svg", "round-layout.svg"],
  ["docs/research/byod/layout-proposal.json", "layout-proposal.json"],
  ["docs/research/byod/BYOD-LICENSE.txt", "BYOD-LICENSE.txt"],
  ["docs/research/byod/BYOD-README.md", "BYOD-README.md"],
  ["LICENSE", "GPL-v3.txt"],
]) {
  let bytes = await readFile(resolve(root, input));
  if (name === "layout-plan.md")
    bytes = Buffer.from(
      bytes
        .toString("utf8")
        .replaceAll("(research/byod/source-review.json)", "(provenance.json)")
        .replaceAll("(research/byod/", "("),
    );
  const original = source.sourceFiles.find((f) => f.copiedAs === name);
  if (original && digest(bytes) !== original.sha256)
    throw Error("Research source bytes mismatch: " + name);
  await writeFile(resolve(out, name), bytes);
  records.push({ path: "/research/byod/" + name, sha256: digest(bytes) });
}
await writeFile(
  resolve(out, "provenance.json"),
  JSON.stringify({ ...source, files: records }, null, 2) + "\n",
);
console.log(
  "BYOD research artifacts:",
  records.length,
  "files; no default reference added",
);
