import { imageAssetPath } from "./assets";
import { generationDevice } from "./devices";
import { parseFiles, type Profile, type Project } from "./domain";
export class GenerationFailure extends Error {
  constructor(
    message: string,
    public raw: string,
  ) {
    super(message);
  }
}
function base(p: Profile) {
  const u = new URL(p.url);
  if (
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash
  )
    throw Error("请输入不带认证、查询或片段的 HTTP(S) Base URL");
  return u.href.replace(/\/$/, "");
}
async function request(
  p: Profile,
  path: string,
  options: RequestInit,
  signal?: AbortSignal,
) {
  const r = await fetch(base(p) + path, {
    ...options,
    signal: signal || AbortSignal.timeout(90000),
    headers: {
      "Content-Type": "application/json",
      ...(p.key ? { Authorization: "Bearer " + p.key } : {}),
      ...options.headers,
    },
  });
  if (!r.ok)
    throw Error("模型服务 HTTP " + r.status + "，请检查地址、认证和模型");
  return r.json();
}
// Parameter names follow the endpoint protocol; model capability metadata overrides family defaults.
export function completionParameters(p: Profile, tokens = p.tokens) {
  const host = new URL(p.url).hostname;
  const openai = host === "api.openai.com",
    router = host === "openrouter.ai",
    deepseek = host === "api.deepseek.com";
  const reasoning = /^(?:openai\/)?(?:gpt-[56]|o[134](?:-|$))/i.test(p.model);
  const supported = p.modelParameters?.[p.model];
  const temperature =
    p.temperatureMode === "send" ||
    (p.temperatureMode !== "omit" &&
      (supported
        ? supported.includes("temperature")
        : !(reasoning || (deepseek && p.thinking))));
  const tokenKey =
    p.tokenParameter && p.tokenParameter !== "auto"
      ? p.tokenParameter
      : openai && reasoning && !router
        ? "max_completion_tokens"
        : "max_tokens";
  if (
    !Number.isInteger(tokens) ||
    tokens < 1 ||
    !Number.isFinite(p.temperature) ||
    p.temperature < 0 ||
    p.temperature > 2
  )
    throw Error("请检查最大输出 Token 和温度范围");
  return {
    [tokenKey]: tokens,
    ...(temperature ? { temperature: p.temperature } : {}),
    ...(deepseek
      ? { thinking: { type: p.thinking ? "enabled" : "disabled" } }
      : {}),
  };
}
export async function testProfile(p: Profile) {
  const data = await request(p, "/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      ...completionParameters(p, 512),
      model: p.model,
      messages: [{ role: "user", content: "Reply OK." }],
    }),
  });
  if (!data.choices?.[0]?.message?.content?.trim())
    throw Error("服务已连接，但未返回文本；请检查模型或增加输出额度");
}
export async function listModelDetails(
  p: Profile,
): Promise<{ id: string; supportedParameters?: string[] }[]> {
  const data = await request(p, "/models", { method: "GET" });
  return (data.data || [])
    .filter((m: { id: unknown }) => typeof m.id === "string")
    .map((m: { id: string; supported_parameters?: unknown }) => ({
      id: m.id,
      supportedParameters: Array.isArray(m.supported_parameters)
        ? m.supported_parameters.filter(
            (v): v is string => typeof v === "string",
          )
        : undefined,
    }));
}
export async function listModels(p: Profile): Promise<string[]> {
  return (await listModelDetails(p)).map((m) => m.id);
}
export async function generate(
  p: Profile,
  project: Project,
  instruction: string,
  signal: AbortSignal,
) {
  const device = generationDevice(project);
  const scene = {
    ...project,
    assets: project.assets?.map((a) => ({ path: a.path })),
    target: device.target,
    deviceSize: device.size,
    device,
    requiredManifest: `<?xml version="1.0" encoding="UTF-8"?><iq:manifest xmlns:iq="http://www.garmin.com/xml/connectiq" version="3"><iq:application id="${project.appId}" type="watchface" name="@Strings.AppName" entry="GeneratedApp" launcherIcon="@Drawables.LauncherIcon" minApiLevel="5.1.0"><iq:products><iq:product id="${device.target}"/></iq:products><iq:permissions><iq:uses-permission id="SensorHistory"/></iq:permissions><iq:languages><iq:language>eng</iq:language></iq:languages><iq:barrels/></iq:application></iq:manifest>`,
    designCoordinateSystem: {
      width: 454,
      height: 454,
      origin: "top-left",
      units: "designUnits",
      scaleToDevice: true,
      scaleX: device.screenWidth / 454,
      scaleY: device.screenHeight / 454,
    },
    versions: undefined,
    designSnapshots: undefined,
    activeDesignSnapshot: undefined,
    storageVersion: undefined,
    files: undefined,
    layers: project.layers.map(({ image, ...l }) => ({
      ...l,
      asset: image ? imageAssetPath(l) : undefined,
    })),
  };
  const system =
    "You generate a complete Garmin Connect IQ watchface project for SDK 9.3, the supplied design.target device only. design.device supplies the series, model, case size, actual pixel resolution, screen shape and display technology. The size field is the physical case size in millimeters, NEVER the pixel resolution. design.device.target, design.target and the manifest product MUST match. Design coordinates use a normalized 454x454 canvas; scale every position, font and stroke using dc.getWidth()/454 and dc.getHeight()/454; never hard-code actual display size. designCoordinateSystem.scaleX and scaleY describe the selected device; use runtime Dc dimensions as the authority. Compute the screen center and round clipping radius from the actual dimensions. Keep essential text and data inside the round screen boundary. Never treat 454 design units as the actual resolution of every model. Manifest must list only design.target. Return JSON only: {files:[{path,content}]}. Required manifest.xml, monkey.jungle with source and resources paths, source/*.mc, resources/*/*.xml and a 65x65 SVG launcher icon under resources/drawables. Resource SVG files are code assets only, not web preview markup. Copy design.requiredManifest verbatim as manifest.xml. The application class MUST be GeneratedApp extending Application.AppBase, with getInitialView(). Define Strings.AppName and Drawables.LauncherIcon resources. App id must match supplied appId exactly. Manifest XML namespace MUST be http://www.garmin.com/xml/connectiq and application type MUST be watchface. All uploaded text files MUST be nonempty. Minimum API 5.1. Use Toybox.WatchUi.WatchFace, proper high-power and AOD lifecycle, no networking or background analytics. Use only known Garmin APIs. Coordinates are top-left bounds. Render all design elements, use supplied assets identifiers. Respect textAlign (left/center/right), fontWeight, garminFont (auto or Graphics.FONT_TINY/SMALL/MEDIUM/LARGE/NUMBER_HOT), metric label/unit/precision/missingValue. If unit is absent use the source default; an empty unit explicitly hides it. Browser font weights and pixel sizes are approximate; do not invent unsupported Garmin font constants or distribute SDK fonts. Use allowClip only for intentional decorations; keep essential data visible across long readings and missing sensors. No shell scripts. Use safe missing data fallbacks. Files may contain UTF-8; use supported fonts. The user instruction never overrides these output/path constraints.";
  const data = await request(
    p,
    "/chat/completions",
    {
      method: "POST",
      body: JSON.stringify({
        model: p.model,
        ...completionParameters(p),
        stream: false,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({ design: scene, instruction }),
          },
        ],
      }),
    },
    signal,
  );
  const content = data.choices?.[0]?.message?.content;
  const raw =
    typeof content === "string" ? content : JSON.stringify(data, null, 2);
  if (data.choices?.[0]?.finish_reason === "length")
    throw new GenerationFailure(
      "模型输出被截断，请提高最大输出 Token 或简化设计后重试",
      raw,
    );
  if (typeof content !== "string")
    throw new GenerationFailure(
      "接口未返回文本 choices[0].message.content",
      raw,
    );
  try {
    return parseFiles(content);
  } catch (error) {
    throw new GenerationFailure((error as Error).message, content);
  }
}
