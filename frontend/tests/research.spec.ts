import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
test("published BYOD research retains original LGPL and reviewed provenance without native binaries", async ({
  request,
}) => {
  const r = await request.get("/research/byod/provenance.json");
  expect(r.ok()).toBe(true);
  const p = await r.json();
  expect(p.purpose).toBe("architectureResearchOnly");
  expect(p.commit).toBe("cd04057cc2a7780747d046f85ec2ef38d2f5f73b");
  expect(p.license).toBe("LGPL-3.0");
  expect(p.sourceFiles).toHaveLength(8);
  for (const file of p.files) {
    expect(file.path).not.toMatch(/\.(mc|prg|iq|fnt|png)$/);
    const response = await request.get(file.path);
    expect(response.ok(), file.path).toBe(true);
    expect(
      createHash("sha256")
        .update(await response.body())
        .digest("hex"),
    ).toBe(file.sha256);
  }
  const license = await (
    await request.get("/research/byod/BYOD-LICENSE.txt")
  ).body();
  expect(createHash("sha256").update(license).digest("hex")).toBe(
    "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768",
  );
  const plan = await (
    await request.get("/research/byod/layout-plan.md")
  ).text();
  for (const link of plan.matchAll(/\]\((?!https?:)([^)]+)\)/g))
    expect((await request.get("/research/byod/" + link[1])).ok(), link[1]).toBe(
      true,
    );
  const svg = await (
    await request.get("/research/byod/round-layout.svg")
  ).text();
  expect(svg).not.toMatch(/<script|\son\w+=|(?:href|src)=/i);
});
test("round layout proposal keeps every corner safe and each example's region ownership unique", async ({
  request,
}) => {
  const p = await (
    await request.get("/research/byod/layout-proposal.json")
  ).json();
  expect(p.status).toBe("proposalNotRuntimeSchema");
  expect(p.slots).toHaveLength(6);
  const center = p.designSize / 2,
    radius = center - p.safeInset;
  for (const slot of p.slots)
    for (const x of [slot.x, slot.x + slot.w])
      for (const y of [slot.y, slot.y + slot.h])
        expect((x - center) ** 2 + (y - center) ** 2).toBeLessThanOrEqual(
          radius ** 2,
        );
  for (const example of p.examples) {
    const used = new Set();
    for (const placement of example.placements)
      for (const id of placement.slots) {
        expect(p.slots.some((s: any) => s.id === id)).toBe(true);
        expect(used.has(id)).toBe(false);
        used.add(id);
      }
    expect(used.size).toBe(6);
  }
});
test("research documents do not register BYOD as a usable or deletable default reference", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator(".reference-card")).toHaveCount(10);
  await expect(page.getByRole("button", { name: /使用 BYOD/ })).toHaveCount(0);
  const p = await (
    await request.get("/reference-notices/provenance.json")
  ).json();
  expect(p.bundles.some((b: any) => /byod/i.test(b.name))).toBe(false);
});
