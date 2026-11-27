import {GENERATION_FIELD_CONTRACT_VERSION} from "../src/generationFields";
import {readRequestHistory,ENGINEERING_PROMPT_VERSION} from "../src/aiRequestHistory";
import { ink } from "../src/Scene";
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
  p.layers.push(image, {...layer("polygon"),polygonPoints:[[0.1,0],[0.9,0],[1,1],[0,1]]});
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
                  { path: "manifest.xml", content: '<application entry="GeneratedApp"/>' },
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
  expect(readRequestHistory().at(-1)).toMatchObject({kind:"engineering",profileId:profile.id,promptVersion:ENGINEERING_PROMPT_VERSION,sourceContractVersion:"1.0.0"});
  expect(design.generationFieldContractVersion).toBe(GENERATION_FIELD_CONTRACT_VERSION);
  expect(design.layers[2].polygonPoints).toEqual([[0.1,0],[0.9,0],[1,1],[0,1]]);
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

test("resolved defaults preserve threshold AOD shape and ring behavior without relying on model guesses", () => {
  const hr = generationLayer(layer("metric"));
  expect(hr.thresholdRules).toEqual([
    { min: 0, max: 120, color: "#55ff99" },
    { min: 120, max: 150, color: "#ffee44" },
    { min: 150, color: "#ff5566" },
  ]);
  expect(hr.aodColor).toBe("#777777");
  const shape = generationLayer(layer("rect"));
  expect(shape.fillEnabled).toBe(true);
  expect(shape.strokeEnabled).toBe(false);
  expect(shape.opacity).toBe(1);
  expect(shape.cornerRadius).toBe(4);
  const ring = generationLayer(layer("ring"));
  expect(ring.ringGoal).toBe(60);
  expect(ring.ringTicks).toBe(60);
  expect(ring.ringDim).toBe(0.25);
  const steps = {
    ...layer("metric"),
    source: "steps",
    threshold: true,
    thresholdRules: [
      { min: 0, max: 10000, color: "#ff0000" },
      { min: 10000, color: "#00ff00" },
    ],
  };
  const d = {
    time: "09:41",
    heartRate: 72,
    steps: 4500,
    battery: 78,
    seconds: 12,
  };
  expect(ink(steps, d)).toBe("#ff0000");
  expect(ink(steps, { ...d, steps: 12500 })).toBe("#00ff00");
});

test("polygon engineering DTO preserves validated vertices without treating arrays as scalars or leaking metadata",()=>{
 const points:[number,number][]=[[0.1,0],[0.9,0],[1,0.2],[1,0.8],[0.9,1],[0.1,1],[0,0.8],[0,0.2]];
 const shape={...layer("polygon"),polygonPoints:points};
 const dto=generationLayer(shape);expect(dto.polygonPoints).toEqual(points);expect(dto.polygonPoints).not.toBe(points);
 expect(()=>generationLayer({...shape,polygonPoints:[[0,0],[1,1],[0,1],[1,0]]})).toThrow(/多边形/);
 expect(()=>generationLayer({...shape,polygonPoints:[[0,0],[Infinity,0],[0,1]]})).toThrow(/多边形/);
 expect(()=>generationLayer({...shape,polygonPoints:[...points,{key:"PRIVATE"}] as any})).toThrow(/多边形/);
 expect(generationLayer({...layer("text"),polygonPoints:points})).not.toHaveProperty("polygonPoints");
});
