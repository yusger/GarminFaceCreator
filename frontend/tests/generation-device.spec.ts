import { test, expect } from "@playwright/test";
import { generate } from "../src/api";
import { project } from "../src/domain";
const profile = {
  id: "test",
  name: "mock",
  url: "https://api.example.com/v1",
  model: "mock-model",
  key: "test-key-must-not-enter-prompt",
  remember: false,
  temperature: 0.2,
  tokens: 8192,
};
for (const [name, target, size, pixels, model] of [
  ["legacy Venu default", undefined, undefined, 454, "Venu 4"],
  ["Venu 4 small", "venu441mm", "41mm", 390, "Venu 4"],
  ["fenix small", "fenix843mm", "43mm", 416, "fēnix 8 AMOLED"],
  ["fenix large shared SDK id", "fenix847mm", "51mm", 454, "fēnix 8 AMOLED"],
] as const) {
  test("generation request describes " + name, async () => {
    const p = { ...project("metadata test"), target, deviceSize: size };
    p.layers[0].image = "data:image/png;base64,PRIVATE_IMAGE_SENTINEL";
    p.assets = [
      {
        path: "resources/a.png",
        data: "data:image/png;base64,PRIVATE_ASSET_SENTINEL",
      },
    ];
    const original = globalThis.fetch;
    let request: any;
    globalThis.fetch = async (_url, options) => {
      request = JSON.parse(String(options?.body));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  files: [
                    { path: "manifest.xml", content: "<manifest/>" },
                    {
                      path: "monkey.jungle",
                      content: "project.manifest=manifest.xml",
                    },
                    { path: "source/App.mc", content: "// test" },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    try {
      await generate(profile, p, "test design", new AbortController().signal);
    } finally {
      globalThis.fetch = original;
    }
    const body = JSON.parse(request.messages[1].content);
    const d = body.design;
    expect(d.device.model).toBe(model);
    expect(d.device.screenWidth).toBe(pixels);
    expect(d.device.screenHeight).toBe(pixels);
    expect(d.target).toBe(target || "venu445mm");
    expect(d.device.target).toBe(d.target);
    expect(d.device.size).toBe(size || "45mm");
    expect(d.deviceSize).toBe(d.device.size);
    expect(d.device.screenShape).toBe("round");
    expect(d.device.screenTechnology).toBe("AMOLED");
    expect(d.designCoordinateSystem.width).toBe(454);
    expect(d.designCoordinateSystem.scaleX).toBe(pixels / 454);
    expect(d.requiredManifest).toContain('<iq:product id="' + d.target + '"/>');
    expect(request.messages[1].content).not.toContain("PRIVATE_IMAGE_SENTINEL");
    expect(request.messages[1].content).not.toContain("PRIVATE_ASSET_SENTINEL");
    expect(request.messages[1].content).not.toContain(profile.key);
    expect(d.files).toBeUndefined();
    expect(d.versions).toBeUndefined();
  });
}
test("invalid target or case size is rejected before calling model", async () => {
  const old = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw Error("must not call");
  };
  try {
    for (const selection of [
      { target: "unknown-model" },
      { target: "venu441mm", deviceSize: "51mm" },
    ]) {
      await expect(
        generate(
          profile,
          { ...project(), ...selection },
          "",
          new AbortController().signal,
        ),
      ).rejects.toThrow("型号或尺寸无效");
    }
    expect(called).toBe(false);
  } finally {
    globalThis.fetch = old;
  }
});
