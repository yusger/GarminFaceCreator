import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { project, layer } from "../../frontend/src/domain.ts";
import { localGenerate } from "../../frontend/src/localGenerator.ts";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
for (const language of ["en", "zh"])
  for (const target of ["venu445mm", "venu441mm", "fenix843mm"]) {
    const form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: crypto.randomUUID(),
        appId: "4c3f31fda59c4f9bb25c4f7774eca711",
        target,
        revision: 1,
        projectName: "WordTime_" + language,
      }),
    );
    const p = project("WordTime", true);
    p.target = target;
    p.appId = "4c3f31fda59c4f9bb25c4f7774eca711";
    p.layers = [
      {
        ...layer("circle"),
        x: 0,
        y: 0,
        w: 454,
        h: 454,
        color: "#07131d",
        fillEnabled: true,
        strokeEnabled: false,
      },
      {
        ...layer("text"),
        text: "WORDS " + language.toUpperCase() + " 11:15",
        x: 80,
        y: 65,
        w: 294,
        h: 35,
        size: 16,
        garminFont: "xtiny",
      },
      {
        ...layer("wordTime"),
        wordLanguage: language,
        wordRow:
          target === "venu441mm"
            ? "bottom"
            : target === "fenix843mm"
              ? "top"
              : "all",
        x: 80,
        y: 140,
        w: 294,
        h: 180,
        size: 32,
        garminFont: language === "zh" ? "systemXTiny" : "xtiny",
        color: "#70c7ff",
      },
    ];
    const files = Object.fromEntries(
      localGenerate(p).map((f) => [
        f.path,
        f.content
          .replaceAll(
            "GfcWordTime.lines(clock.hour,clock.min,clock.sec,",
            "GfcWordTime.lines(11,15,0,",
          )
          .replaceAll(
            "GfcWordTime.lines(clock.hour,clock.min,0,",
            "GfcWordTime.lines(11,15,0,",
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
        await (
          await fetch(base + "/api/builds/" + job.buildId + "/logs")
        ).json(),
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
    console.log("PASS word-time native compile", language, target, job.buildId);
  }
