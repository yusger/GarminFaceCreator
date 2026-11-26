import { buildFetch as fetch } from "./build-client.mjs";
﻿import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { project, layer } from "../../frontend/src/domain.ts";
import { localGenerate } from "../../frontend/src/localGenerator.ts";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
for (const [target, mode] of [
  ["venu445mm", "live"],
  ["venu441mm", "live"],
  ["fenix843mm", "live"],
  ["venu445mm", "thresholds"],
]) {
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      appId: "4c3f31fda59c4f9bb25c4f7774eca711",
      target,
      revision: 1,
      projectName: "DigitsHR_" + mode,
    }),
  );
  const p = project("DigitsHR", true);
  p.target = target;
  p.appId = "4c3f31fda59c4f9bb25c4f7774eca711";
  p.layers = [
    {
      ...layer("text"),
      text: mode === "live" ? "DIGITS / CACHED HR" : "DIGITS / HR FIXTURE",
      x: 60,
      y: 65,
      w: 334,
      h: 35,
      size: 16,
      garminFont: "xtiny",
    },
    ...["hourTens", "hourOnes", "minuteTens", "minuteOnes"].map(
      (timePart, i) => ({
        ...layer("time"),
        timePart,
        x: [80, 150, 235, 305][i],
        y: 145,
        w: 65,
        h: 105,
        size: 80,
        garminFont: "numberHot",
        color: ["#70c7ff", "#76dcba", "#ff88dd", "#ffaa00"][i],
      }),
    ),
    {
      ...layer("text"),
      text: ":",
      x: 217,
      y: 145,
      w: 20,
      h: 105,
      size: 60,
      garminFont: "numberHot",
      aod: true,
    },
    {
      ...layer("time"),
      x: 110,
      y: 255,
      w: 234,
      h: 35,
      size: 20,
      garminFont: "xtiny",
    },
    ...(mode === "live"
      ? [
          {
            ...layer("metric"),
            source: "heartRate",
            label: "CACHED HR",
            metricDecoration: false,
            x: 90,
            y: 330,
            w: 274,
            h: 40,
            size: 24,
            garminFont: "xtiny",
          },
        ]
      : [119, 120, 150].map((value, i) => ({
          ...layer("metric"),
          source: "heartRate",
          label: "FIXTURE " + value,
          metricDecoration: false,
          x: 90,
          y: 300 + i * 40,
          w: 274,
          h: 35,
          size: 24,
          garminFont: "xtiny",
        }))),
  ];
  let fixtureIndex = 0;
  const files = Object.fromEntries(
    localGenerate(p).map((f) => [
      f.path,
      mode === "thresholds" && f.path === "source/App.mc"
        ? f.content.replaceAll(
            "var value=dataheartRate;",
            () => "var value=" + [119, 120, 150][fixtureIndex++] + ";",
          )
        : f.content,
    ]),
  );
  if (mode === "thresholds") assert.equal(fixtureIndex, 3);
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
  console.log("PASS digits and HR native compile", target, mode, job.buildId);
}
