import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { imageFiles, imageAssets } from "./image-fixture.mjs";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
for (const paths of [
  ["assets/red.png", "assets/blue.png"],
  ["assets/红色.png", "assets/蓝色-2.png"],
]) {
  const appId = crypto.randomUUID().replaceAll("-", "");
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      appId,
      target: "venu445mm",
      revision: 1,
      projectName: "ImageResourceTest",
      deviceSize: "45mm",
    }),
  );
  for (const [path, content] of Object.entries({
    ...imageFiles(appId, paths),
    ...imageAssets(paths),
  }))
    form.append("files", new Blob([content]), path);
  const response = await fetch(base + "/api/builds", {
    method: "POST",
    body: form,
  });
  if (paths.some((path) => /[^\x00-\x7f]/.test(path))) {
    assert.equal(response.status, 400, await response.clone().text());
    assert.match((await response.json()).error, /ASCII/);
    console.log(
      "PASS unsupported native Unicode resource paths rejected before compiler",
      paths,
    );
    continue;
  }
  assert.equal(response.status, 202, await response.clone().text());
  const job = await response.json();
  let done;
  for (let i = 0; i < 180; i++) {
    done = await (await fetch(base + "/api/builds/" + job.buildId)).json();
    if (!["queued", "running"].includes(done.status)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const logs = await (
    await fetch(base + "/api/builds/" + job.buildId + "/logs")
  ).json();
  assert.equal(done.status, "succeeded", JSON.stringify(logs));
  const bytes = Buffer.from(
    await (await fetch(base + done.artifacts[0].url)).arrayBuffer(),
  );
  assert.ok(bytes.length > 500);
  if (process.env.GFC_TEST_ARTIFACT_DIR) {
    await mkdir(process.env.GFC_TEST_ARTIFACT_DIR, { recursive: true });
    await writeFile(
      join(process.env.GFC_TEST_ARTIFACT_DIR, done.artifacts[0].fileName),
      bytes,
    );
  }
  console.log("PASS PNG bitmap + bitmap font compile", paths, job.buildId);
}
