import assert from "node:assert/strict";
import { files } from "./fixture.mjs";
const base = process.env.GFC_TEST_URL;
assert.ok(base, "Set GFC_TEST_URL");
const form = new FormData();
form.append("project", JSON.stringify({ projectId: crypto.randomUUID(), appId: "4c3f31fda59c4f9bb25c4f7774eca711", target: "venu445mm", revision: 1, projectName: "Security-" + crypto.randomUUID().slice(0,8) }));
for (const [path, content] of Object.entries(files)) form.append("files", new Blob([content]), path);
const cross = await fetch(base + "/api/builds", { method: "POST", body: form, headers: { Origin: "https://attacker.invalid" } });
assert.equal(cross.status, 403);
const response = await fetch(base + "/api/builds", { method: "POST", body: form });
assert.equal(response.status, 202, await response.clone().text());
const job = await response.json();
assert.match(job.accessToken, /^[A-F0-9]{64}$/);
const headers = { Authorization: "Bearer " + job.accessToken };
let done;
for (let i=0; i<180; i++) {
  const r = await fetch(base + "/api/builds/" + job.buildId, { headers });
  assert.equal(r.status, 200); done = await r.json();
  assert.ok(!JSON.stringify(done).includes(job.accessToken));
  if (!["queued", "running"].includes(done.status)) break;
  await new Promise(r=>setTimeout(r,1000));
}
assert.equal(done.status,"succeeded");
for (const suffix of ["", "/logs", "/artifacts/watchface.prg", "/cancel"]) {
  const url = base + "/api/builds/" + job.buildId + suffix;
  const method = suffix === "/cancel" ? "POST" : "GET";
  for (const init of [{}, { headers: { Authorization: "Bearer " + "0".repeat(64) } }])
    assert.equal((await fetch(url, { method, ...init })).status, 404);
  assert.equal((await fetch(url + "?access_token=" + job.accessToken, { method })).status,404);
}
const artifact = await fetch(base + done.artifacts[0].url,{headers});
assert.equal(artifact.status,200); assert.ok((await artifact.arrayBuffer()).byteLength>500);
assert.equal(artifact.headers.get("cache-control"),"no-store");
assert.equal((await fetch(base+"/api/builds/"+job.buildId+"/logs",{headers})).status,200);
console.log("PASS real compile, task capability required on state/logs/download/cancel, wrong/query credentials rejected, no-store and cross-origin POST rejected");
