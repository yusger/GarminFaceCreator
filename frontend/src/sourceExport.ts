import { iconVariants, iconResourcePath } from "./weatherIcons";
import { preparedAssets, findIcon, originalIcon } from "./iconLibrary";
import { imageAssetPath } from "./assets";
import { parseFiles, type Project } from "./domain";
import { loadReferences } from "./builtins";
import { zipFiles } from "./zip";
const referenceNotices: Record<
  string,
  { name: string; source: string; status: string; files: string[] }
> = {
  "00000000-0000-4000-8000-000000000001": {
    name: "ClownWatch",
    source: "GarminFaceCreator bundled reference",
    status:
      "Repository code GPL-3.0-or-later; Wildward portions MIT; character/artwork rights separate",
    files: ["repository-LICENSE.txt", "ClownWatch-Wildward-LICENSE.txt"],
  },
  "00000000-0000-4000-8000-000000000002": {
    name: "SkyRing",
    source: "https://github.com/daveshap/SkyRingGarmin",
    status:
      "Upstream license not verified; do not infer redistribution permission from public source",
    files: ["SkyRing-README.md"],
  },
  "00000000-0000-4000-8000-000000000003": {
    name: "fine-o-clock",
    source: "https://github.com/causeri3/fine-o-clock",
    status:
      "Upstream LICENCE is LGPLv3, README states GPLv3+; both original statements retained, discrepancy unresolved",
    files: [
      "fine-o-clock-LICENCE.txt",
      "fine-o-clock-README.md",
      "repository-LICENSE.txt",
    ],
  },
};
async function referenceOf(p: Project) {
  if (p.referenceId && referenceNotices[p.referenceId]) return p.referenceId;
  const references = await loadReferences().catch(() => []);
  return references.find(
    (reference) =>
      reference.files.length === p.files.length &&
      reference.files.every((file) =>
        p.files.some(
          (candidate) =>
            candidate.path === file.path &&
            candidate.content ===
              (file.path === "manifest.xml"
                ? file.content.replaceAll(reference.appId, p.appId)
                : file.content),
        ),
      ),
  )?.id;
}
export async function exportSources(
  p: Project,
): Promise<{ name: string; blob: Blob; licenseStatus: string }> {
  if (!p.files.length || p.codeRevision !== p.revision)
    throw Error("请先生成并应用与当前设计一致的完整工程，再导出源码包。");
  const text = new TextEncoder(),
    entries = parseFiles(JSON.stringify({ files: p.files })).map((file) => ({
      path: file.path,
      data: text.encode(file.content),
    }));
  const jungle = entries.find((file) => file.path === "monkey.jungle")!;
  jungle.data = text.encode(
    "project.manifest = manifest.xml\nbase.sourcePath = source\nbase.resourcePath = resources\n",
  );
  for (const asset of await preparedAssets(p)) {
    if (
      !/^(assets|resources)\/[a-zA-Z0-9_/-]+\.(png|jpg|jpeg)$/.test(
        asset.path,
      ) ||
      !/^data:image\/(png|jpeg|webp);base64,/.test(asset.data)
    )
      throw Error("无效的图片素材路径或数据");
    entries.push({
      path: asset.path,
      data: new Uint8Array(await (await fetch(asset.data)).arrayBuffer()),
    });
  }
  const referenceId = await referenceOf(p),
    reference = referenceId ? referenceNotices[referenceId] : undefined;
  for (const file of reference?.files || []) {
    const response = await fetch("/reference-notices/" + file);
    if (!response.ok) throw Error("缺少素材许可声明：" + file);
    entries.push({
      path: "notices/" + file,
      data: new Uint8Array(await response.arrayBuffer()),
    });
  }
  const usedIcons = await Promise.all(
    [
      ...new Set(
        p.layers
          .filter((l) => l.exportIncluded !== false && l.libraryIcon)
          .flatMap((l) => iconVariants(l).map((v) => v.id)),
      ),
    ].map(findIcon),
  );
  for (const icon of usedIcons)
    entries.push({
      path: `source-assets/icons/${icon.id}.svg`,
      data: text.encode(await originalIcon(icon)),
    });
  for (const path of new Set(usedIcons.map((i) => i.licensePath))) {
    const response = await fetch(path);
    if (!response.ok) throw Error("缺少图标许可");
    entries.push({
      path: "licenses/" + path.split("/").at(-1),
      data: new Uint8Array(await response.arrayBuffer()),
    });
  }
  const metadata = {
    usedIcons,
    iconUsages: p.layers
      .filter((l) => l.exportIncluded !== false && l.libraryIcon)
      .map((l) => ({
        icon: l.libraryIcon,
        weather: l.weatherIcon,
        variants: iconVariants(l),
        path: l.weatherIcon ? undefined : imageAssetPath(l),
        resources: iconVariants(l).map((v) => ({
          ...v,
          path: iconResourcePath(l, v.key),
        })),
        color: l.color,
        w: l.w,
        h: l.h,
      })),

    format: "GarminFaceCreator source export",
    projectId: p.id,
    appId: p.appId,
    name: p.name,
    target: p.target || "venu445mm",
    deviceSize: p.deviceSize || "45mm",
    designRevision: p.revision,
    codeRevision: p.codeRevision,
    schemaVersion: p.schemaVersion,
    codeProvenance: p.codeProvenance || { primary: "unknown" },
    reference: reference ? { ...reference, files: undefined } : null,
  };
  entries.push({
    path: "gfc-export.json",
    data: text.encode(JSON.stringify(metadata, null, 2)),
  });
  entries.push({
    path: "README-export.md",
    data: text.encode(
      `# ${p.name}\n\nCode revision: ${p.codeRevision}; design revision: ${p.revision}.\n\nInstall your own Connect IQ SDK 9.3-compatible environment, device package and signing key. Compile with monkeyc -f monkey.jungle -d ${metadata.target} -y YOUR_PRIVATE_KEY -o watchface.prg -r -w. The archive contains source/resources, not the SDK or a signing key. Jungle is normalized to the same source/resources paths as the build service.\n\nReference: ${reference?.source || "No verified bundled reference association"}.\nLicense status: ${reference?.status || "Output licensing depends on actual contents and their sources; the editor license does not automatically license independent outputs."}. Retain applicable copyright, source and modification notices. Images/fonts/characters may have separate rights. This archive does not grant missing upstream permissions.\n\nStatic icon derivatives are rasterized/resized/recolored from pinned originals when used; see gfc-export.json, source-assets/icons and licenses for their sources and notices.\n\nGenerated/adapted using GarminFaceCreator. Web preview is approximate; test the exported source and PRG on the selected device.\n`,
    ),
  });
  return {
    name:
      p.name.replace(/[<>:"/\\|?*\p{Cc}\s]/gu, "_") +
      `_source_r${p.codeRevision}.zip`,
    blob: zipFiles(entries),
    licenseStatus: reference?.status || "请核对工程中实际内容的许可与来源",
  };
}
