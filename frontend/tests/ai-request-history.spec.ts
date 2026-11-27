import { test, expect } from "@playwright/test";
import {
  readRequestHistory,
  startRequestSnapshot,
  finishRequestSnapshot,
  clearRequestHistory,
} from "../src/aiRequestHistory";
test("local request snapshots redact secrets and images, retain versions, cap history and survive quota", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  let quota = false;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) || null,
      setItem: (k: string, v: string) => {
        if (quota) throw Error("quota");
        values.set(k, v);
      },
      removeItem: (k: string) => values.delete(k),
    },
  });
  try {
    clearRequestHistory();
    const key = "sk-private-secret-123456789";
    const id = startRequestSnapshot(
      {
        kind: "chat",
        promptVersion: "chat-2",
        capabilityVersion: "1.0.0",
        model: "test",
        endpoint: "https://example.test",
        request: {
          Authorization: "Bearer " + key,
          messages: [
            { content: key },
            { image_url: { url: "data:image/png;base64,ABC" } },
          ],
        },
      },
      key,
    );
    finishRequestSnapshot(
      id,
      "response",
      { prompt_tokens: 20, completion_tokens: 10, unknown: "value" },
      undefined,
      key,
    );
    let text = JSON.stringify(readRequestHistory());
    expect(text).not.toContain(key);
    expect(text).not.toContain("base64");
    expect(readRequestHistory()[0].usage).toEqual({
      prompt_tokens: 20,
      completion_tokens: 10,
    });
    for (let i = 0; i < 30; i++)
      startRequestSnapshot(
        {
          kind: "design",
          promptVersion: "v",
          capabilityVersion: "1",
          model: "m",
          endpoint: "https://example.test",
          request: { text: "x" },
        },
        "",
      );
    expect(readRequestHistory()).toHaveLength(24);
    quota = true;
    startRequestSnapshot(
      {
        kind: "chat",
        promptVersion: "quota",
        capabilityVersion: "1",
        model: "m",
        endpoint: "https://example.test",
        request: {},
      },
      "",
    );
    expect(readRequestHistory().at(-1)!.promptVersion).toBe("quota");
    clearRequestHistory();
    expect(readRequestHistory()).toEqual([]);
  } finally {
    if (old) Object.defineProperty(globalThis, "localStorage", old);
    else delete (globalThis as any).localStorage;
  }
});
