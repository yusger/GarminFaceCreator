import { test, expect } from "@playwright/test";
import { generate } from "../src/api";
import { project, layer } from "../src/domain";
import { generationLayer } from "../src/generationDto";
const profile = {
  id: "mock",
  name: "mock",
  url: "https://api.example.com/v1",
  model: "mock",
  key: "test-profile-key",
  remember: false,
  tokens: 2048,
  temperature: 0.2,
};
test("model payload uses a schema whitelist and drops imported unknown metadata at every supported nested level", async () => {
  const p: any = project("DTO", true);
  p.secret = "ROOT_PRIVATE_SENTINEL";
  p.profiles = [{ key: "EXTRA_PROFILE_SENTINEL" }];
  p.layoutGuide = {
    presetId: "blank",
    safeInsetPx: 20,
    minFontPx: 14,
    numberFontPx: 64,
    showGuide: true,
    secret: "GUIDE_PRIVATE_SENTINEL",
  };
  p.layers = [
    {
      ...layer("metric"),
      source: "heartRate",
      groupName: "EDITOR_GROUP_SENTINEL",
      privateField: "LAYER_PRIVATE_SENTINEL",
      thresholdRules: [
        { min: 0, max: 120, color: "#00ff00", secret: "RULE_PRIVATE_SENTINEL" },
      ],
    },
  ];
  const image: any = {
    ...layer("image"),
    image: "data:image/png;base64,PIXELS_PRIVATE_SENTINEL",
    libraryIcon: {
      id: "lucide_586bf5cf_heart_pulse",
      recolor: false,
      strokeWidth: 2,
      secret: "ICON_PRIVATE_SENTINEL",
    },
  };
  p.layers.push(image);
  const original = JSON.stringify(p),
    old = globalThis.fetch;
  let payload: any;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(String(options?.body));
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
                  { path: "source/App.mc", content: "// stub" },
                ],
              }),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    await generate(profile, p, "test", new AbortController().signal);
  } finally {
    globalThis.fetch = old;
  }
  const body = JSON.stringify(payload);
  expect(body).not.toContain("PRIVATE_SENTINEL");
  expect(body).not.toContain("EXTRA_PROFILE_SENTINEL");
  expect(body).not.toContain("EDITOR_GROUP_SENTINEL");
  expect(body).not.toContain(profile.key);
  const design = JSON.parse(payload.messages[1].content).design;
  expect(design.layers[0].thresholdRules).toEqual([
    { min: 0, max: 120, color: "#00ff00" },
  ]);
  expect(design.layers[1].libraryIcon.strokeWidth).toBe(2);
  expect(design.layoutGuide.safeInsetPx).toBe(20);
  expect(design.layoutGuide.showGuide).toBeUndefined();
  expect(JSON.stringify(p)).toBe(original);
  const weather: any = {
    ...image,
    weatherIcon: { period: "night", private: "WEATHER_PRIVATE_SENTINEL" },
  };
  expect(JSON.stringify(generationLayer(weather))).not.toContain(
    "WEATHER_PRIVATE_SENTINEL",
  );
});
test("malformed known fields reject nested objects and non-finite numbers before serialization", () => {
  expect(() =>
    generationLayer({ ...layer("text"), color: { key: "private" } } as any),
  ).toThrow(/格式无效/);
  expect(() => generationLayer({ ...layer("rect"), x: Infinity })).toThrow(
    /格式无效/,
  );
});
