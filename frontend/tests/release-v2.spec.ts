import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { validateReleaseV2 } from "../../scripts/reference-release-v2.mjs";
import { localGenerate } from "../src/localGenerator";
for (const [target, size] of [
  ["venu445mm", "45mm"],
  ["venu441mm", "41mm"],
])
  test(`release v2 SDK ${target}`, async ({ request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK test");
    test.setTimeout(130000);
    const design = JSON.parse(
      await readFile(
        "resources/examples/reference-release-v2/design.json",
        "utf8",
      ),
    );
    const manifest = JSON.parse(
      await readFile(
        "resources/examples/reference-release-v2/publish.json",
        "utf8",
      ),
    );
    design.target = target;
    design.deviceSize = size;
    manifest.compatibility.targets = [{ target, deviceSize: size }];
    const { project: p } = validateReleaseV2(manifest, design);
    const form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: p.id,
        appId: p.appId,
        target,
        revision: p.revision,
        projectName: p.name,
      }),
    );
    for (const f of localGenerate(p))
      form.append("files", new Blob([f.content]), f.path);
    const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(r.status).toBe(202);
    const job = await r.json(),
      headers = { Authorization: "Bearer " + job.accessToken };
    await expect
      .poll(
        async () => {
          const s = await (
            await request.get(`/api/builds/${job.buildId}`, { headers })
          ).json();
          if (s.status === "failed") throw Error("Instrument SDK failed");
          return s.status;
        },
        { timeout: 110000, intervals: [1000] },
      )
      .toBe("succeeded");
  });
