import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { files as baseFiles } from "./fixture.mjs";
import { project, layer } from "../../frontend/src/domain.ts";
import {
  generationRequirements,
  generationManifest,
} from "../../frontend/src/generationRequirements.ts";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
for (const [target, sources, title] of [
  ["venu445mm", [], "Clock"],
  ["venu441mm", ["heartRate", "altitude"], "心率时钟"],
  [
    "fenix843mm",
    ["uvIndex", "stress", "recoveryHours", "intensityMinutes"],
    "かな時計",
  ],
]) {
  const p = project(title);
  p.target = target;
  p.appId = "4c3f31fda59c4f9bb25c4f7774eca711";
  p.layers = sources.map((source) => ({ ...layer("metric"), source }));
  const requirements = generationRequirements(p);
  const reads = requirements.dataSources.map((a) =>
    a.read.replace(/ \(.*$/, ""),
  );
  const calls = reads
    .map((r, i) => `try { var value${i}=${r}; } catch(e) {}`)
    .join("\n");
  const nativeSource = `import Toybox.Application; import Toybox.WatchUi; import Toybox.Graphics; import Toybox.System; import Toybox.ActivityMonitor; import Toybox.SensorHistory; import Toybox.Weather; import Toybox.Complications;
 class GeneratedApp extends Application.AppBase {function initialize(){AppBase.initialize();} function getInitialView(){return [new NativeView()];}}
 class NativeView extends WatchUi.WatchFace {function initialize(){WatchFace.initialize();} function onUpdate(dc as Graphics.Dc) as Void { ${calls} dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();dc.setColor(Graphics.COLOR_WHITE,Graphics.COLOR_TRANSPARENT);dc.drawText(dc.getWidth()/2,120,Graphics.FONT_SMALL,"${title}",Graphics.TEXT_JUSTIFY_CENTER);}}`;
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
  const files = {
    ...baseFiles,
    "source/App.mc": nativeSource,
    "resources/strings/strings.xml": `<strings><string id="AppName">${title}</string></strings>`,
    "manifest.xml": generationManifest(p),
  };
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
  console.log(
    "PASS native requirements compile",
    target,
    requirements.minApiLevel,
    requirements.permissions,
    requirements.languages,
    job.buildId,
  );
}
