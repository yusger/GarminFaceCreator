import { buildFetch as fetch } from "./build-client.mjs";
import assert from "node:assert/strict";
import { files } from "./fixture.mjs";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
const { targets } = await (await fetch(base + "/api/capabilities")).json();
for (const target of targets) {
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      appId: "4c3f31fda59c4f9bb25c4f7774eca711",
      target,
      revision: 1,
    }),
  );
  for (const [name, content] of Object.entries(files))
    form.append(
      "files",
      new Blob([
        name === "manifest.xml"
          ? content.replaceAll("venu445mm", target)
          : content,
      ]),
      name,
    );
  const response = await fetch(base + "/api/builds", {
    method: "POST",
    body: form,
  });
  assert.equal(response.status, 202, await response.clone().text());
  const job = await response.json();
  for (let i = 0; i < 180; i++) {
    const state = await (
      await fetch(base + "/api/builds/" + job.buildId)
    ).json();
    if (!["queued", "running"].includes(state.status)) {
      assert.equal(
        state.status,
        "succeeded",
        await (
          await fetch(base + "/api/builds/" + job.buildId + "/logs")
        ).text(),
      );
      assert.equal(state.target, target);
      assert.equal((await fetch(base + state.artifacts[0].url)).status, 200);
      console.log("PASS", target);
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
    if (i === 179) throw Error("Timeout");
  }
}
