import {needsNativeMoon} from "./nativeMoon.ts";
import {suncalcLicense} from "./suncalcNotice.ts";
import {usedBitmapFonts,bitmapFontResourceId,bitmapPngBytes,bitmapFontInfo} from "./bitmapFonts.ts";
import { expandWidgets } from "./compound";
import {widgetNotices} from "./widgets";
import handImageAttribution from "./handImageAttribution.json" with {type:"json"};
import { preparedCodeFiles, chalkPlans } from "./chalkFonts";
import {
  referenceAttributions,
  observedTemplates,
  attributionSnapshot,
} from "./attribution";
import { iconVariants, iconResourcePath } from "./weatherIcons";
import { preparedAssets, findIcon, originalIcon } from "./iconLibrary";
import { imageAssetPath } from "./assets";
import { parseFiles, type Project } from "./domain";
import { loadReferences } from "./builtins";
import { zipFiles } from "./zip";
const referenceNotices: Record<
  string,
  { name: string; source: string; status: string; files: string[] }
> = Object.fromEntries(referenceAttributions.map((r) => [r.id, r]));
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
  p = expandWidgets(p);
  const text = new TextEncoder(),
    entries = parseFiles(
      JSON.stringify({ files: await preparedCodeFiles(p) }),
    ).map((file) => ({
      path: file.path,
      data: text.encode(file.content),
    }));
  for(const o of widgetNotices(p)) entries.push({path:"notices/widget-"+o.id+"-"+o.version+"-LICENSE.txt",data:text.encode(o.license)},{path:"notices/widget-"+o.id+"-"+o.version+"-NOTICE.md",data:text.encode(o.notice)});
  for(const notice of handImageAttribution) if(p.layers.some(l=>l.handBitmap?.packId===notice.packId || l.assetId?.startsWith("hand-image-"+notice.packId+"-"))) {
    entries.push({path:"notices/"+notice.packId+"-NOTICE.md",data:text.encode(notice.notice)},{path:"notices/"+notice.packId+"-LICENSE.txt",data:text.encode(notice.license)});
  }
  if (p.starterId === "pulsemaniac") {
    for (const name of ["NOTICE.md", "PROMPTS.md"]) {
      const r = await fetch("/pulsemaniac/" + name);
      if (!r.ok) throw Error("PulseManiac 素材来源说明不可用");
      entries.push({
        path: "notices/PulseManiac-" + name,
        data: new Uint8Array(await r.arrayBuffer()),
      });
    }
  }
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
    if (entries.some((entry) => entry.path === "notices/" + file)) continue;
    const response = await fetch("/reference-notices/" + file);
    if (!response.ok) throw Error("缺少素材许可声明：" + file);
    entries.push({
      path: "notices/" + file,
      data: new Uint8Array(await response.arrayBuffer()),
    });
  }
  if(needsNativeMoon(p))entries.push({path:"notices/suncalc-1.9.0-LICENSE.txt",data:text.encode(suncalcLicense)});
  for(const f of usedBitmapFonts(p)){const id=bitmapFontResourceId(f.id);entries.push({path:"source-assets/fonts/"+id+"/original.fnt",data:text.encode(f.descriptor)},{path:"source-assets/fonts/"+id+"/"+bitmapFontInfo(f).page,data:bitmapPngBytes(f.atlasData,bitmapFontInfo(f))},{path:"source-assets/fonts/"+id+"/LICENSE.txt",data:text.encode(f.license+"\nSource: "+f.source)});}
  for (const name of new Set(chalkPlans(p).map((plan) => plan.font))) {
    const local=p.localFonts?.find(f=>f.file===name);
    if(local){entries.push({path:"source-assets/fonts/"+name,data:new Uint8Array(await (await fetch(local.data)).arrayBuffer())},{path:"source-assets/fonts/"+name.replace(/\.(ttf|otf)$/, "-LICENSE.txt"),data:text.encode(local.license+"\nSource: "+local.source)});continue;}
    for (const path of [
      "/fonts/" + name,
      "/fonts/" + name.replace(/\.(ttf|otf)$/, "-LICENSE.txt"),
    ]) {
      const response = await fetch(path);
      if (!response.ok) throw Error("缺少字体或许可");
      entries.push({
        path: "source-assets/fonts/" + path.split("/").at(-1),
        data: new Uint8Array(await response.arrayBuffer()),
      });
    }
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
  const templates = observedTemplates(p.files);
  const origins =
    reference || templates.length ? await attributionSnapshot() : null;
  const templateSources = [];
  for (const template of templates) {
    const snapshot = origins.generators.find(
      (g: { sourceFile: string; version: string }) =>
        g.sourceFile === template.sourceFile && g.version === template.version,
    );
    templateSources.push({
      ...template,
      sourceLicense:
        template.sourceFile === "frontend/src/wordTime.ts"
          ? "GPL-3.0-or-later adapter; MIT locale phrases"
          : "GPL-3.0-or-later",
      sourceContext: snapshot || null,
      note: snapshot
        ? "Copied native template source context attached; independent inputs and separate assets retain their own status"
        : "Historical template source snapshot unavailable; actual native source is included",
    });
  }
  if (templates.some((t) => t.sourceFile === "frontend/src/wordTime.ts")) {
    if (!origins.wordTimeLocale?.files?.length)
      throw Error("缺少文字报时原始许可和文本来源");
    for (const file of origins.wordTimeLocale.files) {
      const noticePath = "notices/" + file.path.split("/").at(-1);
      if (entries.some((entry) => entry.path === noticePath)) continue;
      const r = await fetch(file.path);
      if (!r.ok) throw Error("缺少文字报时原始许可");
      entries.push({
        path: noticePath,
        data: new Uint8Array(await r.arrayBuffer()),
      });
    }
  }
  if (templates.length) {
    const license = await fetch(origins.licensePath);
    if (!license.ok) throw Error("缺少固定模板许可证");
    entries.push({
      path: "licenses/GarminFaceCreator-LICENSE.txt",
      data: new Uint8Array(await license.arrayBuffer()),
    });
    for (const source of new Map(
      templateSources
        .filter((t) => t.sourceContext)
        .map((t) => [t.sourceContext.path, t.sourceContext]),
    ).values()) {
      const response = await fetch(source.path);
      if (!response.ok) throw Error("缺少固定模板来源快照");
      entries.push({
        path:
          "notices/generator-sources/" + source.sourceFile.split("/").at(-1),
        data: new Uint8Array(await response.arrayBuffer()),
      });
    }
    entries.push({
      path: "notices/native-template-origin.md",
      data: text.encode(
        "# Fixed native template origin\n\nThe listed native files include template text produced from GarminFaceCreator, whose repository is GPL-3.0-or-later. The repository license and matching available source-context snapshots are attached. Complete actual Monkey C source/resources are included for native compilation. Source-context TypeScript is documentation of the copied templates, not a standalone tool build. Licensing is assessed by actual contents: this notice does not blanket-license independent AI output, user inputs, upstream artwork or fonts. See gfc-export.json for per-file/version scope and reference uncertainties.\n",
      ),
    });
  }
  entries.push({
    path: "design-source.json",
    data: text.encode(
      JSON.stringify(
        {
          schemaVersion: p.schemaVersion,
          designBrief: p.designBrief,
          controls: p.controls,
          controlValues: p.controlValues,
          backgroundColor: p.backgroundColor,
          starterId: p.starterId,
          name: p.name,
          target: p.target,
          deviceSize: p.deviceSize,
          layoutGuide: p.layoutGuide,
          layers: p.layers
            .filter((l) => l.exportIncluded !== false)
            .map(({ image, ...layer }) => ({
              ...layer,
              imageResource:
                image && !layer.weatherIcon ? imageAssetPath(layer) : undefined,
              imageVariants: layer.weatherIcon
                ? iconVariants(layer).map((v) => ({
                    ...v,
                    path: iconResourcePath(layer, v.key),
                  }))
                : undefined,
            })),
        },
        null,
        2,
      ),
    ),
  });
  const metadata = {
    usedIcons,
    wordTimeLocale: templates.some(
      (t) => t.sourceFile === "frontend/src/wordTime.ts",
    )
      ? origins.wordTimeLocale
      : undefined,
    templateSources,
    referenceSnapshot: reference
      ? origins.bundles.find((r: { id: string }) => r.id === referenceId)
      : null,
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

    starterId: p.starterId,
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
    licenseStatus:
      reference?.status ||
      (templates.length
        ? "含固定原生模板代码，已附其来源与仓库许可证；独立内容和素材分别核查"
        : "请核对工程中实际内容的许可与来源"),
  };
}
