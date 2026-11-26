import { buildFetch as fetch } from "./build-client.mjs";
﻿import assert from "node:assert/strict";
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
      projectName: "LiveData",
    }),
  );
  const p = project("LiveData", true);
  p.target = target;
  p.appId = "4c3f31fda59c4f9bb25c4f7774eca711";
  p.layers = [
    { ...layer("time"), x: 80, y: 155, w: 294, h: 100, size: 75 },
    { ...layer("date"), x: 100, y: 100, w: 254, h: 40, size: 26, aod: true },
    {
      ...layer("metric"),
      source: "steps",
      label: "STEPS",
      x: 90,
      y: 265,
      w: 274,
      h: 35,
      size: 24,
      threshold: false,
    },
    {
      ...layer("metric"),
      source: "battery",
      label: "BAT",
      x: 90,
      y: 300,
      w: 274,
      h: 35,
      size: 24,
      aod: true,
      thresholdRules: [
        { min: 0, max: 60, color: "#ffaa00" },
        { min: 60, color: "#00aaff" },
      ],
    },
    {
      ...layer("metric"),
      source: "distance",
      label: "DIST",
      unit: " km",
      precision: 2,
      x: 90,
      y: 335,
      w: 274,
      h: 32,
      size: 20,
      threshold: false,
    },
    {
      ...layer("metric"),
      source: "calories",
      label: "TOTAL",
      unit: " kcal",
      x: 100,
      y: 370,
      w: 254,
      h: 32,
      size: 18,
      threshold: false,
    },
    {
      ...layer("metric"),
      source: "seconds",
      x: 300,
      y: 130,
      w: 60,
      h: 35,
      size: 22,
      aod: true,
      aodSeconds: "zero",
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
  console.log("PASS live data native compile", target, job.buildId);
}
