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
  ["venu445mm", "day"],
  ["venu445mm", "night"],
  ["venu445mm", "missing"],
  ["venu445mm", "positionWest"],
  ["venu445mm", "positionEast"],
]) {
  const p = project("Solar_" + mode, true);
  p.target = target;
  p.layers = [
    { ...layer("celestial"), h: 260 },
    {
      ...layer("celestial"),
      solarPart: "body",
      x: 50,
      y: 80,
      w: 354,
      h: 180,
      color: "#ffce60",
      solarNightColor: "#dfedff",
    },
    {
      ...layer("rect"),
      x: 0,
      y: 260,
      w: 454,
      h: 194,
      color: "#101b1c",
      fillEnabled: true,
      strokeEnabled: false,
      allowClip: true,
    },
    {
      ...layer("text"),
      text:
        mode === "live"
          ? "SOLAR DEVICE API"
          : "FIXTURE " +
            (mode.startsWith("position") ? "POSITION" : mode.toUpperCase()),
      x: 60,
      y: 55,
      w: 334,
      h: 30,
      size: 14,
      garminFont: "xtiny",
      color: "#d2e4ee",
    },
    {
      ...layer("time"),
      x: 65,
      y: 295,
      w: 324,
      h: 100,
      size: 80,
      garminFont: "numberHot",
      color: "#e5eff4",
    },
  ];
  const fixture = { day: "[1,0.35]", night: "[0,0.5]", missing: "[-1,0.0]" };
  const files = Object.fromEntries(
    localGenerate(p).map((f) => [
      f.path,
      fixture[mode] && f.path === "source/App.mc"
        ? f.content.replace(
            "var solar=sleeping?solarCached:getSolarState();",
            "var solar=" + fixture[mode] + ";",
          )
        : f.content,
    ]),
  );
  if (mode.startsWith("position")) {
    const source = files["source/App.mc"],
      old =
        "var info=Position.getInfo();if(info!=null && info.position!=null){";
    assert.equal(source.includes(old), true);
    const coords =
      mode === "positionWest" ? [38.856147, -94.800953] : [31.2304, 121.4737];
    files["source/App.mc"] = source
      .replace(
        old,
        `var testLocation=new Position.Location({:latitude=>${coords[0]},:longitude=>${coords[1]},:format=>:degrees});if(testLocation!=null){`,
      )
      .replaceAll("info.position.toDegrees()", "testLocation.toDegrees()")
      .replaceAll("info.position,query", "testLocation,query");
  }
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
  console.log("PASS solar native compile", target, mode, job.buildId);
}
