import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { project, layer } from "../../frontend/src/domain.ts";
import { localGenerate } from "../../frontend/src/localGenerator.ts";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
for (const target of ["venu445mm", "venu441mm", "fenix843mm"]) {
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      appId: "4c3f31fda59c4f9bb25c4f7774eca711",
      target,
      revision: 1,
      projectName: "GraphicsStyleTest",
    }),
  );
  const p = project("Local Clock", true);
  p.target = target;
  p.appId = "4c3f31fda59c4f9bb25c4f7774eca711";
  p.layers = [
    {
      ...layer("rect"),
      x: 80,
      y: 70,
      w: 280,
      h: 100,
      cornerRadius: 15,
      strokeEnabled: true,
      strokeColor: "#ff8800",
      opacity: 0.5,
    },
    { ...layer("circle"), x: 180, y: 300, w: 80, h: 45, strokeEnabled: true },
    { ...layer("line"), x: 100, y: 380, w: 200, h: 1 },
    { ...layer("time"), x: 70, y: 185, w: 310, h: 100, size: 80 },
    { ...layer("text"), text: "LOCAL CLOCK", x: 140, y: 280 },
  ];
  const files = Object.fromEntries(
    localGenerate(p).map((f) => [f.path, f.content]),
  );
  for (const [path, content] of Object.entries(files))
    form.append("files", new Blob([content]), path);
  const response = await fetch(base + "/api/builds", {
    method: "POST",
    body: form,
  });
  assert.equal(response.status, 202, await response.clone().text());
  const job = await response.json();
  let state;
  for (let i = 0; i < 180; i++) {
    state = await (await fetch(base + "/api/builds/" + job.buildId)).json();
    if (!["queued", "running"].includes(state.status)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(
    state.status,
    "succeeded",
    JSON.stringify(
      await (await fetch(base + "/api/builds/" + job.buildId + "/logs")).json(),
    ),
  );
  if (process.env.GFC_TEST_ARTIFACT_DIR) {
    await mkdir(process.env.GFC_TEST_ARTIFACT_DIR, { recursive: true });
    await writeFile(
      join(process.env.GFC_TEST_ARTIFACT_DIR, state.artifacts[0].fileName),
      Buffer.from(
        await (await fetch(base + state.artifacts[0].url)).arrayBuffer(),
      ),
    );
  }
  console.log("PASS local generator native compile", target, job.buildId);
}
