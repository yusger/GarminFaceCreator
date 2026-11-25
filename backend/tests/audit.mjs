import assert from "node:assert/strict";
import { files } from "./fixture.mjs";
const base = process.env.GFC_TEST_URL;
assert.ok(base, "Set GFC_TEST_URL");
const run = "Audit-" + crypto.randomUUID().slice(0, 8);
async function submit(name, changes = {}, suffix = "/api/builds") {
  const form = new FormData();
  form.append("project", JSON.stringify({ projectId: crypto.randomUUID(), appId: "4c3f31fda59c4f9bb25c4f7774eca711", target: "venu445mm", revision: 1, projectName: run + name }));
  for (const [path, content] of Object.entries({ ...files, ...changes })) form.append("files", new Blob([content]), path);
  return fetch(base + suffix, { method: "POST", body: form, headers: { "X-Forwarded-For": "8.8.8.8", "X-Real-IP": "8.8.8.8" } });
}
for (const [name, changes, expected, suffix] of [
  ["-正常表盘", {}, "succeeded", "/api/builds"],
  ["-错误表盘\r\n[伪造]", { "source/App.mc": "INVALID SYNTAX @@@" }, "failed", "/API/BUILDS/"]
]) {
  const response = await submit(name, changes, suffix);
  assert.equal(response.status, 202, await response.clone().text());
  const accepted = await response.json();
  let done;
  for (let n = 0; n < 180; n++) {
    done = await (await fetch(base + "/api/builds/" + accepted.buildId)).json();
    if (!["queued", "running"].includes(done.status)) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  assert.equal(done.status, expected);
  assert.equal(Object.hasOwn(done, "callerIp"), false, "caller identity must not leak into build API");
  console.log("PASS", run, expected, accepted.buildId);
}
const bad = await submit("-校验失败", { "../escape.mc": "bad" });
assert.equal(bad.status, 400);
console.log("PASS", run, "validation rejection; verify same run in persistent host log");
