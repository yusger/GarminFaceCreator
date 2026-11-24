import type { Project } from "./domain";
const verified = new Set([
  "venu441mm",
  "venu445mm",
  "venu3",
  "venu3s",
  "fr57042mm",
  "fr57047mm",
  "fr970",
  "fenix843mm",
  "fenix847mm",
]);
export function graphicsCapabilities(p: Pick<Project, "target">) {
  const target = p.target || "venu445mm",
    enhanced = verified.has(target);
  return {
    target,
    enhancedGraphics: enhanced,
    alphaBlending: enhanced,
    colorBits: enhanced ? 16 : null,
    primitiveApi: "1.0.0",
    rgbaApi: "4.0.0",
    sourceOverApi: "4.2.1",
    verifiedFrom:
      "Connect IQ SDK 9.3 device metadata and official Graphics/Dc API",
  };
}
export function validateGraphics(p: Project) {
  const capability = graphicsCapabilities(p);
  if (
    !capability.alphaBlending &&
    p.layers.some(
      (l) =>
        l.exportIncluded !== false &&
        ["rect", "circle", "line"].includes(l.kind) &&
        (l.opacity ?? 1) < 1,
    )
  )
    throw Error(
      "当前目标尚未验证透明混合，请使用不透明形状或完成设备能力验证。",
    );
  return capability;
}
