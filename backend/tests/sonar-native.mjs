// Test-only native fixtures. Production sources and package data are never overwritten.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
const dir = join(tmpdir(), "gfc-sonar"),
  base = process.env.GFC_TEST_URL;
assert(base, "GFC_TEST_URL is required");
const bytes = await readFile(join(dir, "source.zip")),
  files = new Map();
let offset = 0;
while (bytes.readUInt32LE(offset) === 0x04034b50) {
  const size = bytes.readUInt32LE(offset + 18),
    n = bytes.readUInt16LE(offset + 26),
    e = bytes.readUInt16LE(offset + 28),
    start = offset + 30 + n + e;
  files.set(
    bytes.subarray(offset + 30, offset + 30 + n).toString(),
    bytes.subarray(start, start + size),
  );
  offset = start + size;
}
const meta = JSON.parse(files.get("gfc-export.json").toString()),
  source = files.get("source/App.mc").toString();
assert(source.includes("basic-18-design-packages"));
assert(source.includes("var bg=sleeping?"));
await mkdir(dir, { recursive: true });
const scenarios = [
  {
    name: "baseline",
    hr: 72,
    steps: 8420,
    battery: 86,
    source: 0,
    seconds: true,
  },
  {
    name: "distance",
    hr: 72,
    steps: 8420,
    battery: 86,
    source: 2,
    seconds: false,
  },
  {
    name: "alert",
    hr: 150,
    steps: 10000,
    battery: 9,
    source: 0,
    seconds: true,
  },
  {
    name: "missing",
    hr: null,
    steps: null,
    battery: null,
    source: 0,
    seconds: true,
  },
];
for (const test of scenarios) {
  const appId = crypto.randomUUID().replaceAll("-", ""),
    form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      projectName: "SONAR_TEST_" + test.name,
      appId,
      target: "venu445mm",
      deviceSize: "45mm",
      revision: 0,
    }),
  );
  for (const [path, data] of files) {
    if (
      !/^(manifest\.xml|monkey\.jungle|source\/.*\.mc|resources\/.*\.(xml|svg|fnt|png)|assets\/.*\.png)$/.test(
        path,
      )
    )
      continue;
    let content = data;
    if (path === "manifest.xml")
      content = data.toString().replaceAll(meta.appId, appId);
    if (path === "source/App.mc") {
      const value = (v) => (v === null ? "null" : String(v));
      const helper = `class GfcFixtureClock {var hour=10;var min=24;var sec=7;} class GfcFixtureCalendar {var year=2026;var month=11;var day=25;var day_of_week=4;}\n`;
      content = source
        .replace("class GeneratedApp", helper + "class GeneratedApp")
        .replace(
          "var clock=System.getClockTime();",
          "var clock=new GfcFixtureClock();",
        )
        .replace(
          "var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);",
          "var calendar=new GfcFixtureCalendar();",
        )
        .replace(
          "function px(value)",
          `function fixtureHr() as Toybox.Lang.Number or Null{return ${value(test.hr)};} function fixtureSteps() as Toybox.Lang.Number or Null{return ${value(test.steps)};} function fixtureBattery() as Toybox.Lang.Number or Null{return ${value(test.battery)};}\nfunction px(value)`,
        )
        .replace(
          "var bg=sleeping?",
          `dataheartRate=fixtureHr();datasteps=fixtureSteps();databattery=fixtureBattery();datadistance=6.42;System.println("SONAR TEST ${test.name}");var bg=sleeping?`,
        );
    }
    if (path === "resources/settings/properties.xml")
      content = data
        .toString()
        .replace(
          /(<property id="Gfc_right_slot_source" type="number">)\d+(<\/property>)/,
          "$1" + test.source + "$2",
        )
        .replace(
          /(<property id="Gfc_show_seconds" type="boolean">)(true|false)(<\/property>)/,
          "$1" + test.seconds + "$3",
        );
    form.append("files", new Blob([content]), path);
  }
  const r = await fetch(base + "/api/builds", { method: "POST", body: form });
  assert.equal(r.status, 202, await r.clone().text());
  const job = await r.json();
  let done = false;
  for (let i = 0; i < 180; i++) {
    const state = await (
      await fetch(base + "/api/builds/" + job.buildId)
    ).json();
    if (
      ["succeeded", "failed", "cancelled", "interrupted"].includes(state.status)
    ) {
      assert.equal(
        state.status,
        "succeeded",
        await (
          await fetch(base + "/api/builds/" + job.buildId + "/logs")
        ).text(),
      );
      await writeFile(
        join(dir, "test-" + test.name + ".prg"),
        Buffer.from(
          await (await fetch(base + state.artifacts[0].url)).arrayBuffer(),
        ),
      );
      console.log("PASS SONAR native fixture", test.name, job.buildId);
      done = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert(done, "Fixture compile timeout");
}
