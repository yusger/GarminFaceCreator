import { test, expect } from "@playwright/test";
import { themedFixture } from "./fixtures/themedFixture";
import {
  mergeNativeSettings,
  managedSettingPaths,
} from "../src/nativeManagedSettings";
import { sourceCode } from "../src/nativeSettingIds";
import { localGenerate } from "../src/localGenerator";
import { generate } from "../src/api";
import { repairPayload } from "../src/repair";
test("missing declarations are supplied with valid stable source defaults while source drawing stays exact", () => {
  const p = themedFixture();
  const code = {
    path: "source/Model.mc",
    content: "// model source stays exact",
  };
  const result = mergeNativeSettings(p, [code]);
  expect(result.find((f) => f.path === code.path)).toEqual(code);
  for (const path of managedSettingPaths)
    expect(result.some((f) => f.path === path)).toBe(true);
  const props = result.find((f) => f.path === managedSettingPaths[0])!.content;
  expect(props).toContain("Gfc_Theme");
  for (const c of p.controls!.filter((c) => c.type === "dataSource"))
    expect(props).toContain(
      ">" + sourceCode(String(c.default)) + "</property>",
    );
  expect(mergeNativeSettings(p, result)).toEqual(result);
});
test("duplicate managed XML definitions are removed without consuming adjacent unknown tags or private keys", () => {
  const p = themedFixture();
  const f = {
    path: "resources/custom.xml",
    content: `<resources><property id='Gfc_Theme' type='number'/><property id="Unrelated" type="number">12</property><property id="Other" type="number"/><property id="Gfc_Theme" type="number">123</property><string id="Unrelated">Preserve me</string></resources>`,
  };
  const result = mergeNativeSettings(p, [f]).find(
    (x) => x.path === f.path,
  )!.content;
  expect(result).not.toContain("Gfc_Theme");
  expect(result).toContain(
    '<property id="Unrelated" type="number">12</property>',
  );
  expect(result).toContain('<property id="Other" type="number"/>');
  expect(result).toContain("Preserve me");
});
test("managed settings cannot be changed by paid source repair", () => {
  const p = themedFixture();
  p.files = mergeNativeSettings(p, []);
  expect(() =>
    repairPayload(p, [managedSettingPaths[0]], "", {
      key: "test",
      model: "mock",
    } as any),
  ).toThrow("不允许");
});
test("AI generation composes settings resources without requiring the mocked model to declare them", async () => {
  const p = themedFixture(),
    files = localGenerate(p).filter(
      (f) => !managedSettingPaths.includes(f.path),
    ),
    original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: JSON.stringify({ files }) },
              finish_reason: "stop",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    const result = await generate(
      {
        id: "mock",
        name: "Mock",
        url: "https://example.invalid/v1",
        model: "mock",
        key: "test",
        temperature: 0,
        tokens: 8192,
        remember: false,
      },
      p,
      "test",
      AbortSignal.timeout(10000),
    );
    expect(result.some((f) => f.path === managedSettingPaths[0])).toBe(true);
    expect(result.find((f) => f.path === "source/App.mc")!.content).toBe(
      files.find((f) => f.path === "source/App.mc")!.content,
    );
  } finally {
    globalThis.fetch = original;
  }
});

import { repairCode } from "../src/api";
import {
  readRequestHistory,
  clearRequestHistory,
} from "../src/aiRequestHistory";
test("repair response usage is persisted in redacted local request history", async () => {
  const p = themedFixture();
  p.files = localGenerate(p);
  const original = globalThis.fetch,
    file = p.files.find((f) => f.path === "source/App.mc")!;
  try {
    clearRequestHistory();
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  files: [
                    {
                      ...file,
                      content: file.content + "\n// simulated repair",
                    },
                  ],
                }),
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 20,
            total_tokens: 120,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    await repairCode(
      {
        id: "mock",
        name: "Mock",
        url: "https://example.invalid/v1",
        model: "mock",
        key: "test-secret",
        temperature: 0,
        tokens: 8192,
        remember: false,
      },
      p,
      [file.path],
      "synthetic diagnostic",
      AbortSignal.timeout(10000),
    );
    const r = readRequestHistory().find((r) => r.kind === "repair")!;
    expect(r.usage?.total_tokens).toBe(120);
    expect(r.promptVersion).toBe("repair-1-recorded-usage");
    expect(JSON.stringify(r)).not.toContain("test-secret");
  } finally {
    globalThis.fetch = original;
  }
});
