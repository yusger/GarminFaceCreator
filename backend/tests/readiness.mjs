import assert from "node:assert/strict";
const base = process.env.GFC_TEST_URL || "http://localhost:18380";
const cap = await (await fetch(base + "/api/capabilities")).json();
assert.equal(cap.devices.length, cap.targets.length);
assert.deepEqual(
  cap.devices.map((x) => x.target),
  cap.targets,
);
assert.equal(
  cap.ready,
  cap.devices.some((x) => x.ready),
);
for (const device of cap.devices) {
  assert.equal(device.ready, device.reasons.length === 0);
  if (!cap.common.ready) assert.equal(device.ready, false);
}
const ready = process.env.GFC_EXPECT_READY_TARGET;
const missing = process.env.GFC_EXPECT_MISSING_TARGET;
if (ready)
  assert.equal(cap.devices.find((x) => x.target === ready)?.ready, true);
if (missing) {
  assert.equal(cap.devices.find((x) => x.target === missing)?.ready, false);
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: crypto.randomUUID(),
      appId: "4c3f31fda59c4f9bb25c4f7774eca711",
      target: missing,
      revision: 1,
    }),
  );
  const response = await fetch(base + "/api/builds", {
    method: "POST",
    body: form,
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).detail, new RegExp(missing));
}
console.log("PASS common/per-target readiness and missing-target rejection", {
  ready,
  missing,
});
