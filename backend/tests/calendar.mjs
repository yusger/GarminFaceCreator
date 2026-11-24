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
      projectName: "CalendarLeap",
    }),
  );
  const p = project("CalendarLeap", true);
  p.target = target;
  p.appId = "4c3f31fda59c4f9bb25c4f7774eca711";
  p.layers = [
    {
      ...layer("text"),
      text: "LEAP 2028-03-01",
      x: 90,
      y: 40,
      w: 274,
      h: 32,
      size: 16,
      garminFont: "tiny",
    },
    {
      ...layer("calendar"),
      calendarStart: "monday",
      x: 80,
      y: 85,
      w: 294,
      h: 150,
      color: "#e8eff7",
    },
    {
      ...layer("calendar"),
      calendarStart: "sunday",
      x: 80,
      y: 250,
      w: 294,
      h: 150,
      color: "#e8eff7",
      calendarTodayColor: "#ffaa00",
    },
  ];
  const files = Object.fromEntries(
    localGenerate(p).map((f) => [
      f.path,
      f.content.replaceAll(
        "Gregorian.info(Time.now(),Time.FORMAT_SHORT)",
        "Gregorian.utcInfo(Gregorian.moment({:year=>2028,:month=>3,:day=>1,:hour=>12}),Time.FORMAT_SHORT)",
      ),
    ]),
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
  console.log("PASS leap calendar native compile", target, job.buildId);
}
