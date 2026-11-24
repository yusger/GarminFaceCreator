import assert from "node:assert/strict";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
const appId = "4c3f31fda59c4f9bb25c4f7774eca711";
import { files } from "./fixture.mjs";
async function submit(changes = {}, target = "venu445mm") {
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      appId,
      target,
      revision: 1,
    }),
  );
  for (const [path, content] of Object.entries({ ...files, ...changes }))
    form.append("files", new Blob([content]), path);
  return fetch(base + "/api/builds", { method: "POST", body: form });
}
async function terminal(id) {
  for (let i = 0; i < 180; i++) {
    const j = await (await fetch(`${base}/api/builds/${id}`)).json();
    if (!["queued", "running"].includes(j.status)) return j;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw Error("Build did not finish");
}
assert.equal((await fetch(base + "/api/health")).status, 200);
assert.equal(
  (await (await fetch(base + "/api/capabilities")).json()).ready,
  true,
);
assert.equal((await submit({}, "venu441mm")).status, 400);
assert.equal((await submit({ "../escape.mc": "bad" })).status, 400);
assert.equal(
  (
    await submit({
      "resources/external.xml": '<!DOCTYPE x SYSTEM "file:///etc/passwd"><x/>',
    })
  ).status,
  400,
);
console.log("PASS health, device restriction, path traversal, DTD rejection");
let response = await submit();
assert.equal(response.status, 202, await response.clone().text());
const j = await response.json();
const done = await terminal(j.buildId);
const log = await (await fetch(`${base}/api/builds/${j.buildId}/logs`)).json();
assert.equal(done.status, "succeeded", JSON.stringify(log));
const artifact = await fetch(base + done.artifacts[0].url);
assert.equal(artifact.status, 200);
assert.ok((await artifact.arrayBuffer()).byteLength > 500);
console.log("PASS real Garmin compile and PRG download", j.buildId);
response = await submit({ "source/App.mc": "INVALID SYNTAX @@@" });
const fail = await terminal((await response.json()).buildId);
assert.equal(fail.status, "failed");
assert.equal(
  (await fetch(`${base}/api/builds/${fail.buildId}/artifacts/watchface.prg`))
    .status,
  404,
);
console.log("PASS compile failure and unavailable artifact");
response = await submit();
const cancel = await response.json();
await fetch(`${base}/api/builds/${cancel.buildId}/cancel`, { method: "POST" });
const cancelled = await terminal(cancel.buildId);
assert.equal(cancelled.status, "cancelled");
console.log("PASS cancellation");
