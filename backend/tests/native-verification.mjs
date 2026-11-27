// Explicit SDK + native service integration. Credentials remain in memory only.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { buildFetch } from "./build-client.mjs";
import { validateReleaseV2 } from "../../scripts/reference-release-v2.mjs";
const base = process.env.GFC_TEST_URL?.replace(/\/$/, ""),
  dir = resolve("Temp/native-api-validation");
if (
  !base ||
  process.env.GFC_TEST_SDK !== "1" ||
  process.env.GFC_NATIVE_TEST !== "1"
)
  throw Error("Set explicit staging URL and both SDK/native test switches");
const cap = await (await fetch(base + "/api/capabilities")).json();
assert.equal(cap.nativeVerification?.enabled, true);
assert.equal(cap.nativeVerification.ready, true);
await mkdir(dir, { recursive: true });
async function state(url, terminal, timeout = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const r = await buildFetch(base + url);
    assert.equal(r.status, 200);
    const data = await r.json();
    if (terminal.includes(data.status)) return data;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw Error("Task polling deadline exceeded");
}
async function compile(target) {
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
  design.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  manifest.compatibility.targets = [{ target, deviceSize: design.deviceSize }];
  const prepared = validateReleaseV2(manifest, design),
    form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: design.id,
      appId: design.appId,
      target,
      deviceSize: design.deviceSize,
      revision: 0,
      projectName: "Native API validation",
    }),
  );
  for (const f of prepared.files)
    form.append("files", new Blob([f.content]), f.path);
  const r = await buildFetch(base + "/api/builds", {
    method: "POST",
    body: form,
  });
  assert.equal(r.status, 202);
  const { buildId } = await r.json();
  const completed = await state("/api/builds/" + buildId, [
    "succeeded",
    "failed",
    "cancelled",
    "interrupted",
  ]);
  assert.equal(completed.status, "succeeded");
  return {
    id: buildId,
    path: "/api/builds/" + buildId + "/native-verification",
    completed,
    prepared,
  };
}
for (const [target, pixels] of [
  ["venu445mm", 454],
  ["venu441mm", 390],
]) {
  const job = await compile(target);
  for (const suffix of [
    "",
    "/artifacts/screen.png",
    "/artifacts/metadata.json",
    "/cancel",
  ])
    for (const headers of [{}, { Authorization: "Bearer " + "0".repeat(64) }])
      assert.equal(
        (
          await fetch(base + job.path + suffix, {
            method: suffix === "/cancel" ? "POST" : "GET",
            headers,
          })
        ).status,
        404,
      );
  assert.equal(
    (
      await buildFetch(base + job.path, {
        method: "POST",
        headers: { Origin: "https://invalid.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await buildFetch(base + job.path, { method: "POST", body: "{}" })).status,
    400,
  );
  const start = await buildFetch(base + job.path, { method: "POST" });
  assert.equal(start.status, 202);
  assert.ok(!(await start.clone().text()).includes("accessToken"));
  const duplicate = await buildFetch(base + job.path, { method: "POST" });
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).attempt, 1);
  const result = await state(job.path, [
    "succeeded",
    "failed",
    "cancelled",
    "interrupted",
  ]);
  assert.equal(result.status, "succeeded", result.error);
  assert.equal(result.report.cleanupStatus, "completed");
  assert.equal(
    result.sourceSha256,
    createHash("sha256")
      .update(
        job.prepared.files.find((f) => f.path === "source/App.mc").content,
      )
      .digest("hex"),
  );
  assert.equal(result.generatorVersion, job.prepared.generatorVersion);
  assert.equal(result.projectId, job.prepared.project.id);
  assert.equal(result.revision, 0);
  assert.equal(result.report.width, pixels);
  assert.equal(result.report.height, pixels);
  assert.equal(result.report.hardware, "unverified");
  assert.equal(result.report.pngBase64, null);
  const prg = await buildFetch(base + job.completed.artifacts[0].url);
  assert.equal(
    result.prgSha256,
    createHash("sha256")
      .update(Buffer.from(await prg.arrayBuffer()))
      .digest("hex"),
  );
  const image = await buildFetch(
    base + result.artifacts.find((a) => a.id === "screen.png").url,
  );
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("cache-control"), "no-store");
  const png = Buffer.from(await image.arrayBuffer());
  assert.equal(png.readUInt32BE(16), pixels);
  assert.equal(png.readUInt32BE(20), pixels);
  await writeFile(join(dir, target + ".png"), png);
  await writeFile(
    join(dir, target + ".json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  const metadata = await buildFetch(
    base + result.artifacts.find((a) => a.id === "metadata.json").url,
  );
  assert.equal(metadata.status, 200);
  assert.equal((await metadata.json()).prgSha256, result.prgSha256);
  assert.equal(
    (await buildFetch(base + "/api/builds/" + job.id).then((r) => r.json()))
      .status,
    "succeeded",
  );
  console.log(
    "PASS protected native API",
    target,
    "idempotent submit, digest, dimensions, metadata, no-store and build remains succeeded",
  );
}
const cancel = await compile("venu445mm");
assert.equal(
  (await buildFetch(base + cancel.path, { method: "POST" })).status,
  202,
);
await state(cancel.path, ["running"]);
assert.equal(
  (await buildFetch(base + cancel.path + "/cancel", { method: "POST" })).status,
  200,
);
const stopped = await state(cancel.path, [
  "cancelled",
  "failed",
  "interrupted",
]);
assert.equal(stopped.status, "cancelled");
assert.equal(stopped.canRetry, true);
assert.equal(stopped.artifacts.length, 0);
assert.equal(
  (await buildFetch(base + "/api/builds/" + cancel.id).then((r) => r.json()))
    .status,
  "succeeded",
);
console.log(
  "PASS native cancellation and retry eligibility are independent of compiled PRG",
);
