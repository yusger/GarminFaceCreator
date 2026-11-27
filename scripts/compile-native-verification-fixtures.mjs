// Maintainer-only normal dynamic PRGs; no frozen data injection or library registration.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { validateReleaseV2 } from "./reference-release-v2.mjs";
const compile = process.argv.includes("--compile"),
  base = process.env.GFC_TEST_URL?.replace(/\/$/, ""),
  dir = resolve("Temp/native-verification"),
  hash = (b) => createHash("sha256").update(b).digest("hex");
if (
  compile &&
  (!base ||
    !["http:", "https:"].includes(new URL(base).protocol) ||
    new URL(base).pathname !== "/" ||
    new URL(base).username ||
    new URL(base).password)
)
  throw Error("Set an explicit staging origin");
await mkdir(dir, { recursive: true });
for (const [target, size, pixels] of [
  ["venu445mm", "45mm", 454],
  ["venu441mm", "41mm", 390],
]) {
  const design = JSON.parse(
      await readFile(
        "resources/examples/reference-release-v2/design.json",
        "utf8",
      ),
    ),
    manifest = JSON.parse(
      await readFile(
        "resources/examples/reference-release-v2/publish.json",
        "utf8",
      ),
    );
  design.target = target;
  design.deviceSize = size;
  manifest.compatibility.targets = [{ target, deviceSize: size }];
  const prepared = validateReleaseV2(manifest, design);
  const meta = {
    target,
    pixels,
    generatorVersion: prepared.generatorVersion,
    sourceSha256: hash(JSON.stringify(prepared.files)),
    fixedData: false,
    simulator: "not run",
    hardware: "unverified",
    notPublished: true,
  };
  if (!compile) {
    await writeFile(
      join(dir, target + "-source.json"),
      JSON.stringify(prepared.files, null, 2),
    );
    console.log(target + " prepared; no compilation");
    continue;
  }
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: design.id,
      appId: design.appId,
      target,
      deviceSize: size,
      revision: 0,
      projectName: design.name,
    }),
  );
  for (const f of prepared.files)
    form.append("files", new Blob([f.content]), f.path);
  const r = await fetch(base + "/api/builds", {
    method: "POST",
    body: form,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (r.status !== 202) throw Error("SDK submit HTTP " + r.status);
  const job = await r.json();
  if (
    !/^[a-f0-9]{32}$/.test(job.buildId) ||
    !/^[a-f0-9]{64}$/i.test(job.accessToken)
  )
    throw Error("Invalid protected job");
  const headers = { Authorization: "Bearer " + job.accessToken };
  let state;
  for (let i = 0; i < 170; i++) {
    const poll = await fetch(base + "/api/builds/" + job.buildId, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!poll.ok) throw Error("SDK poll HTTP " + poll.status);
    state = await poll.json();
    if (!["queued", "running"].includes(state.status)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (state?.status !== "succeeded")
    throw Error("SDK fixture " + state?.status);
  const url = new URL(state.artifacts?.[0]?.url, base);
  if (
    url.origin !== base ||
    !url.pathname.startsWith("/api/builds/" + job.buildId + "/")
  )
    throw Error("Unexpected artifact address");
  const result = await fetch(url, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw Error("PRG download HTTP " + result.status);
  const prg = Buffer.from(await result.arrayBuffer());
  await writeFile(join(dir, target + ".prg"), prg);
  await writeFile(
    join(dir, target + ".json"),
    JSON.stringify(
      {
        ...meta,
        prgSha256: hash(prg),
        sdk: "compilation succeeded",
        buildId: job.buildId,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    target + " normal dynamic SDK fixture succeeded, " + prg.length + " bytes",
  );
}
