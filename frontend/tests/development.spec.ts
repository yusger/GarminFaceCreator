import { test, expect } from "@playwright/test";
import config from "../vite.config";
test("development API proxy is configurable and rejects credential-bearing addresses", async () => {
  const prior = { ...process.env };
  try {
    process.env.GFC_API_PROXY = "https://compiler.example.com";
    process.env.GFC_DEV_HOST = "127.0.0.1";
    process.env.GFC_DEV_PORT = "5177";
    const result = await (config as any)({ mode: "test", command: "serve" });
    expect(result.server.proxy["/api"].target).toBe(
      "https://compiler.example.com",
    );
    expect(result.server.port).toBe(5177);
    process.env.GFC_API_PROXY = "https://user:secret@compiler.example.com";
    await expect(
      Promise.resolve().then(() =>
        (config as any)({ mode: "test", command: "serve" }),
      ),
    ).rejects.toThrow(/无认证/);
  } finally {
    for (const key of ["GFC_API_PROXY", "GFC_DEV_HOST", "GFC_DEV_PORT"]) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
});
