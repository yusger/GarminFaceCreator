import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { project, layer } from "../../frontend/src/domain.ts";
import { localGenerate } from "../../frontend/src/localGenerator.ts";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
for (const target of ["venu445mm", "venu441mm", "fenix843mm"]) {
  const mode = "live",
    p = project("Paint", true);
  p.target = target;
  const shape = (kind, props) => ({
    ...layer(kind),
    fillEnabled: true,
    strokeEnabled: false,
    ...props,
  });
  p.layers = [
    shape("circle", {
      x: 0,
      y: 0,
      w: 454,
      h: 454,
      color: "#ffffff",
      allowClip: true,
    }),
    {
      ...layer("text"),
      text: "PAINT / ALPHA",
      x: 60,
      y: 55,
      w: 334,
      h: 30,
      size: 16,
      garminFont: "xtiny",
      color: "#000000",
    },
    shape("rect", {
      x: 100,
      y: 110,
      w: 100,
      h: 80,
      cornerRadius: 0,
      color: "#ff0000",
      opacity: 0.5,
    }),
    shape("rect", {
      x: 254,
      y: 110,
      w: 100,
      h: 80,
      cornerRadius: 0,
      color: "#000000",
      opacity: 0.5,
    }),
    shape("circle", { x: 110, y: 230, w: 80, h: 80, color: "#0044ff" }),
    shape("rect", {
      x: 125,
      y: 245,
      w: 50,
      h: 50,
      cornerRadius: 0,
      fillEnabled: false,
      strokeEnabled: true,
      strokeWidth: 5,
      strokeColor: "#ffffff",
      color: "#ff0000",
    }),
    shape("rect", {
      x: 250,
      y: 225,
      w: 108,
      h: 30,
      cornerRadius: 0,
      color: "#000000",
    }),
    {
      ...layer("meter"),
      source: "battery",
      meterGoal: 100,
      meterCount: 10,
      meterDim: 0.3,
      x: 254,
      y: 230,
      w: 100,
      h: 15,
      color: "#ffffff",
    },
    {
      ...layer("text"),
      text: "50% ALPHA",
      x: 100,
      y: 365,
      w: 254,
      h: 30,
      size: 20,
      garminFont: "xtiny",
      color: "#000000",
    },
  ];
  const files = Object.fromEntries(
    localGenerate(p).map((f) => [f.path, f.content]),
  );
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: p.id,
      appId: p.appId,
      target,
      revision: 1,
      projectName: p.name,
    }),
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
  console.log("PASS paint native compile", target, mode, job.buildId);
}
