import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
test("pinned icon catalog serves static originals and complete license notices", async ({
  request,
}) => {
  const response = await request.get("/icon-library/catalog.json");
  expect(response.ok()).toBeTruthy();
  const catalog = await response.json();
  expect(catalog.format).toBe(1);
  expect(catalog.icons).toHaveLength(27);
  expect(new Set(catalog.icons.map((i: any) => i.id)).size).toBe(27);
  await Promise.all(
    catalog.icons.map(async (icon: any) => {
      expect(icon.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(icon.path).toMatch(
        /^\/icon-library\/(lucide|meteocons)\/[a-z-]+\.svg$/,
      );
      const r = await request.get(icon.path);
      expect(r.ok()).toBeTruthy();
      const data = await r.body();
      expect(createHash("sha256").update(data).digest("hex")).toBe(icon.sha256);
      expect(data.toString()).not.toMatch(
        /<(?:script|animate|animateTransform|animateMotion|foreignObject|image|use)\b/i,
      );
      expect(icon.viewBox).toBeTruthy();
      expect(icon.licensePath).toMatch(/LICENSE\.txt$/);
    }),
  );
  const lucide = await (
    await request.get("/icon-library/licenses/Lucide-LICENSE.txt")
  ).text();
  expect(lucide).toContain("ISC");
  expect(lucide).toContain("MIT");
  expect(lucide).toContain("Feather");
  const weather = await (
    await request.get("/icon-library/licenses/Meteocons-LICENSE.txt")
  ).text();
  expect(weather).toContain("MIT");
  expect(weather).toContain("Bas Milius");
});
