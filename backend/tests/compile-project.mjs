import { buildFetch as fetch } from "./build-client.mjs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.argv[2]);
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
const manifest = await readFile(path.join(root, "manifest.xml"), "utf8");
const appId = manifest.match(/<iq:application\s+id="([a-f0-9]+)"/i)?.[1];
if (!appId) throw Error("Missing manifest application id");
const form = new FormData();
form.append(
  "project",
  JSON.stringify({
    projectId: crypto.randomUUID(),
    appId,
    target: "venu445mm",
    revision: 0,
  }),
);
async function add(relative) {
  const full = path.join(root, relative);
  const entries = await readdir(full, { withFileTypes: true });
  for (const entry of entries) {
    const name = relative + "/" + entry.name;
    if (entry.isDirectory()) await add(name);
    else if (/\.(mc|xml|svg|png|jpg|jpeg|fnt)$/i.test(name))
      form.append(
        "files",
        new Blob([await readFile(path.join(root, name))]),
        name,
      );
  }
}
for (const file of ["manifest.xml", "monkey.jungle"])
  form.append("files", new Blob([await readFile(path.join(root, file))]), file);
await add("source");
await add("resources");
const response = await fetch(base + "/api/builds", {
  method: "POST",
  body: form,
});
if (response.status !== 202) throw Error(await response.text());
const job = await response.json();
console.log("Build", job.buildId);
for (let i = 0; i < 200; i++) {
  const state = await (await fetch(`${base}/api/builds/${job.buildId}`)).json();
  if (!["queued", "running"].includes(state.status)) {
    console.log(JSON.stringify(state));
    console.log(
      await (await fetch(`${base}/api/builds/${job.buildId}/logs`)).text(),
    );
    if (state.status !== "succeeded") process.exitCode = 1;
    else
      console.log(
        "PRG bytes:",
        (await (await fetch(base + state.artifacts[0].url)).arrayBuffer())
          .byteLength,
      );
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
  if (i === 199) throw Error("Timed out");
}
