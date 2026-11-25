import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
test("all canonical references publish equivalent independent source, assets and metadata", async ({
  request,
}) => {
  const entries = await readdir("default-watchfaces", { withFileTypes: true });
  const ids = new Set<string>();
  for (const entry of entries.filter((e) => e.isDirectory())) {
    const root = "default-watchfaces/" + entry.name;
    const ref = JSON.parse(await readFile(root + "/reference.json", "utf8"));
    const bundle = await (
      await request.get("/default-watchfaces/" + entry.name + "/project.json")
    ).json();
    expect(bundle.project.id).toBe(ref.identity.id);
    expect(ids.has(ref.identity.id)).toBe(false);
    ids.add(ref.identity.id);
    expect(ref.authorship).toBe(
      ["clownwatch", "pulsemaniac", "sonar"].includes(entry.name) ? "self" : "community",
    );
    for (const file of bundle.project.files)
      expect(file.content).toBe(await readFile(root + "/" + file.path, "utf8"));
    for (const image of [...bundle.images, ...bundle.binaryAssets]) {
      const response = await request.get(image.url || image.path);
      expect(response.ok()).toBe(true);
      expect(
        createHash("sha256")
          .update(await response.body())
          .digest("hex"),
      ).toBe(image.sha256);
    }
  }
  expect(ids.size).toBe(12);
});
test("self-authored badges remain distinct from protected defaults", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".reference-card")).toHaveCount(12);
  await expect(page.locator(".reference-card .authorship-badge")).toHaveCount(
    3,
  );
  for (const name of ["ClownWatch", "PulseManiac", "SONAR"]) {
    const card = page
      .locator(".reference-card")
      .filter({
        has: page.getByRole("button", { name: "使用 " + name, exact: true }),
      });
    await expect(card.locator(".authorship-badge")).toHaveText("自主");
    await expect(
      card.getByRole("button", { name: "删除 " + name, exact: true }),
    ).toHaveCount(0);
  }
});
