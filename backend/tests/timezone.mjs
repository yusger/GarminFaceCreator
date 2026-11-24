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
  const p = project("Zones_" + mode, true);
  p.target = target;
  p.layers = [
    {
      ...layer("text"),
      text: mode === "live" ? "FIXED UTC / LIVE" : "UTC FIXTURE 23:50",
      x: 60,
      y: 45,
      w: 334,
      h: 30,
      size: 16,
      garminFont: "xtiny",
    },
  ];
  for (const [i, offset] of [0, 345, 840, -720].entries()) {
    p.layers.push({
      ...layer("text"),
      text: ["UTC+00:00", "UTC+05:45", "UTC+14:00", "UTC-12:00"][i],
      x: 100,
      y: 90 + i * 80,
      w: 254,
      h: 24,
      size: 14,
      garminFont: "xtiny",
      color: "#7995aa",
    });
    p.layers.push({
      ...layer("time"),
      timeUtcOffset: offset,
      x: 100,
      y: 114 + i * 80,
      w: 254,
      h: 50,
      size: 34,
      garminFont: "medium",
      color: ["#ffffff", "#76dcba", "#70c7ff", "#ffaa00"][i],
    });
  }
  const files = Object.fromEntries(
    localGenerate(p).map((f) => [
      f.path,
      mode === "fixture" && f.path === "source/App.mc"
        ? f.content.replace(
            "var zoneNow=Time.now();",
            "var zoneNow=Gregorian.moment({:year=>2028,:month=>3,:day=>1,:hour=>23,:minute=>50,:second=>0});",
          )
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
  console.log("PASS fixed UTC native compile", target, mode, job.buildId);
}
