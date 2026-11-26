import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
test("all canonical references publish equivalent independent source, assets and metadata", async ({
  request,
}) => {
  const entries = await readdir("resources/default-watchfaces", { withFileTypes: true });
  const ids = new Set<string>();
  for (const entry of entries.filter((e) => e.isDirectory())) {
    const root = "resources/default-watchfaces/" + entry.name;
    const ref = JSON.parse(await readFile(root + "/reference.json", "utf8"));
    const bundle = await (
      await request.get("/default-watchfaces/" + entry.name + "/project.json")
    ).json();
    expect(bundle.project.id).toBe(ref.identity.id);
    expect(ids.has(ref.identity.id)).toBe(false);
    ids.add(ref.identity.id);
    expect(ref.authorship).toBe(
      ["clownwatch", "pulsemaniac", "sonar"].includes(entry.name)
        ? "self"
        : "community",
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
    const card = page.locator(".reference-card").filter({
      has: page.getByRole("button", { name: "使用 " + name, exact: true }),
    });
    await expect(card.locator(".authorship-badge")).toHaveText("自主");
    await expect(
      card.getByRole("button", { name: "删除 " + name, exact: true }),
    ).toHaveCount(0);
  }
});

test("project navigation separates built-ins and browser projects, retains selection and places owned badges first", async ({
  page,
}) => {
  await page.goto("/");
  const builtin = page.getByRole("button", { name: "内置表盘", exact: true });
  const mine = page.getByRole("button", { name: "我的表盘", exact: true });
  const cards = page.locator(".project-card");
  await expect(builtin).toHaveAttribute("aria-current", "page");
  await expect(cards).toHaveCount(12);
  const firstNames = await cards
    .locator(".project-card-info > div > b")
    .allTextContents();
  expect(firstNames.slice(0, 3).sort()).toEqual(
    ["ClownWatch", "PulseManiac", "SONAR"].sort(),
  );
  for (const name of ["ClownWatch", "PulseManiac", "SONAR"]) {
    const card = cards.filter({
      has: page.getByRole("button", { name: "使用 " + name, exact: true }),
    });
    const protectedBox = await card.locator(".reference-badge").boundingBox();
    const ownedBox = await card.locator(".authorship-badge").boundingBox();
    expect(ownedBox!.x).toBeGreaterThanOrEqual(
      protectedBox!.x + protectedBox!.width,
    );
    expect(
      Math.abs(
        ownedBox!.y +
          ownedBox!.height / 2 -
          protectedBox!.y -
          protectedBox!.height / 2,
      ),
    ).toBeLessThan(3);
  }
  await page.screenshot({
    path: "docs/screenshots/projects-builtins.png",
    fullPage: true,
  });
  await mine.click();
  await expect(cards).toHaveCount(0);
  await expect(page.locator(".project-filters")).toContainText("我的表盘 0");
  await builtin.click();
  await page.getByPlaceholder("搜索项目").fill("SONAR");
  await expect(cards).toHaveCount(1);
  await page.getByPlaceholder("搜索项目").fill("找不到的项目");
  await expect(page.getByText("当前分类中没有匹配的表盘。")).toBeVisible();
  await page.getByPlaceholder("搜索项目").fill("");
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(mine).toHaveAttribute("aria-current", "page");
  await expect(cards).toHaveCount(1);
  await expect(page.locator(".reference-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "打开 ClownWatch 副本", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(mine).toHaveAttribute("aria-current", "page");
  await expect(cards).toHaveCount(1);
  await page.screenshot({
    path: "docs/screenshots/projects-mine.png",
    fullPage: true,
  });
  await builtin.click();
  await expect(cards).toHaveCount(12);
  await expect(
    page.getByRole("button", { name: "打开 ClownWatch 副本", exact: true }),
  ).toHaveCount(0);
  await mine.click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "删除 ClownWatch 副本", exact: true })
    .click();
  await expect(cards).toHaveCount(0);
  await builtin.click();
  await expect(cards).toHaveCount(12);
});
