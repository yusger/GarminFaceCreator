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
      projectName: "GoalMeters",
    }),
  );
  const p = project("GoalMeters", true);
  p.target = target;
  p.appId = "4c3f31fda59c4f9bb25c4f7774eca711";
  p.layers = [
    {
      ...layer("meter"),
      meterShape: "left",
      x: 0,
      y: 67,
      w: 88,
      h: 320,
      source: "steps",
      meterGoal: 10000,
      meterCount: 20,
      color: "#ff9f20",
    },
    {
      ...layer("meter"),
      meterShape: "right",
      x: 366,
      y: 67,
      w: 88,
      h: 320,
      source: "battery",
      meterGoal: 100,
      meterCount: 20,
      color: "#00aaff",
    },
    { ...layer("time"), x: 90, y: 170, w: 274, h: 95, size: 75 },
    {
      ...layer("text"),
      text: "STEP / BATTERY",
      x: 90,
      y: 120,
      w: 274,
      h: 35,
      size: 24,
    },
    {
      ...layer("meter"),
      x: 110,
      y: 300,
      w: 234,
      h: 18,
      source: "battery",
      meterGoal: 100,
      meterCount: 20,
      color: "#00aaff",
      aod: true,
      aodColor: "#777777",
    },
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
  console.log("PASS goal meters native compile", target, job.buildId);
}
