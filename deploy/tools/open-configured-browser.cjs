// Dedicated local browser profile. No credentials are stored in the repository.
const { chromium } = require("@playwright/test");
const path = require("node:path");
(async () => {
  const context = await chromium.launchPersistentContext(
    path.join(process.env.LOCALAPPDATA, "GarminFaceCreator", "Browser"),
    { channel: "msedge", headless: false, viewport: null },
  );
  const page = await context.newPage();
  await page.goto(process.env.GFC_TEST_URL || "http://localhost:18380");
})();
