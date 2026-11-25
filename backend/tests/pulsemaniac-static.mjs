// Repeatable visual test artifacts only. Never use fixed HR values in production code.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
const directory = join(tmpdir(), "gfc-pulsemaniac"),
  base = process.env.GFC_TEST_URL;
assert(base, "GFC_TEST_URL is required");
const bytes = await readFile(join(directory, "source.zip")),
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
const meta = JSON.parse(files.get("gfc-export.json").toString());
assert.equal(meta.starterId, "pulsemaniac");
const source = files.get("source/App.mc").toString(),
  marker = "dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();";
assert(source.includes("basic-17-chalk-fonts"));
assert.equal(source.split(marker).length, 2);
await mkdir(directory, { recursive: true });
const results = [];
for (const [name, hr] of [
  ["ready", 110],
  ["twist", 130],
  ["maniac", 158],
  ["missing", null],
]) {
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      projectName: "PulseManiac_TEST_" + name,
      appId: meta.appId,
      target: "venu445mm",
      deviceSize: "45mm",
      revision: 0,
    }),
  );
  for (const [path, bytes] of files) {
    if (
      !/^(manifest\.xml|monkey\.jungle|source\/.*\.mc|resources\/.*\.(xml|svg|fnt|png)|assets\/.*\.png)$/.test(
        path,
      )
    )
      continue;
    const data =
      path === "source/App.mc"
        ? source
            .replace(
              "function px(value)",
              `function fixtureHeartRate() as Toybox.Lang.Number or Null {return ${hr === null ? "null" : hr};}\n function px(value)`,
            )
            .replace(
              marker,
              `dataheartRate=fixtureHeartRate();System.println("PulseManiac TEST HR=${hr}");${marker}`,
            )
        : bytes;
    form.append("files", new Blob([data]), path);
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
      const prg = await fetch(base + state.artifacts[0].url);
      assert.equal(prg.status, 200);
      await writeFile(
        join(directory, "test-" + name + ".prg"),
        Buffer.from(await prg.arrayBuffer()),
      );
      results.push({ name, hr, buildId: job.buildId, status: state.status });
      console.log("PASS static fixture", name, job.buildId);
      done = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert(done, "Fixture build timeout");
}
await writeFile(
  join(directory, "fixtures.json"),
  JSON.stringify(results, null, 2),
);
