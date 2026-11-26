import { buildFetch as fetch } from "./build-client.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { project, layer } from "../../frontend/src/domain.ts";
import { localGenerate } from "../../frontend/src/localGenerator.ts";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
for (const [target, mode] of [
  ["venu445mm", "live"],
  ["venu441mm", "live"],
  ["fenix843mm", "live"],
  ["venu445mm", "fixture"],
]) {
  const p = project("Hands_" + mode, true);
  p.target = target;
  p.layers = [
    {
      ...layer("circle"),
      x: 0,
      y: 0,
      w: 454,
      h: 454,
      color: "#000000",
      fillEnabled: true,
      strokeEnabled: false,
      allowClip: true,
      aod: true,
      aodColor: "#000000",
    },
    {
      ...layer("text"),
      text: mode === "live" ? "HANDS DEVICE TIME" : "FIXTURE 03:15:30",
      x: 60,
      y: 55,
      w: 334,
      h: 30,
      size: 16,
      garminFont: "xtiny",
      color: "#8da4b2",
    },
  ];
  for (const [i, handType] of ["hour", "minute", "second"].entries())
    p.layers.push({
      ...layer("hand"),
      handType,
      handReach: [0.58, 0.79, 0.88][i],
      strokeWidth: [8, 5, 2][i],
      color: ["#ffffff", "#76dcba", "#ffaa00"][i],
      aod: handType !== "second",
      aodColor: "#777777",
    });
  p.layers.push({
    ...layer("circle"),
    x: 221,
    y: 221,
    w: 12,
    h: 12,
    color: "#ffffff",
    fillEnabled: true,
    strokeEnabled: false,
    aod: true,
    aodColor: "#777777",
  });
  const files = Object.fromEntries(
    localGenerate(p).map((f) => [
      f.path,
      mode === "fixture" && f.path === "source/App.mc"
        ? f.content.replace(
            "var clock=System.getClockTime();",
            "var clock=new HandFixture();",
          ) +
          "\nclass HandFixture {var hour=3;var min=15;var sec=30;function initialize(){}}\n"
        : f.content,
    ]),
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
  console.log("PASS hands native compile", target, mode, job.buildId);
}
