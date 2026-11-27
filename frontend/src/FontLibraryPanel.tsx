import {bitmapTypographyReset} from "./bitmapTypographyFields";
import {importBitmapFont,bitmapFontInfo,bitmapGlyphMissing,type BitmapFontAsset} from "./bitmapFonts.ts";
import {bitmapLayerPatch} from "./bitmapFontLayout.ts";
import BitmapFontText from "./BitmapFontText";
import { importLocalFont, fontBytes, type LocalFont } from "./localFonts";
import { useEffect, useState } from "react";
import type { Layer, Project } from "./domain";
import { libraryFonts, fontPatch, missingGlyphs } from "./fontLibrary";
import { deviceFor } from "./devices";
export default function FontLibrary({
  layer,
  project,
  onApply,
  onImport,
  onBitmapImport,
  onClose,
}: {
  layer: Layer;
  project: Project;
  onApply: (patch: Partial<Layer>) => void;
  onImport?: (font: LocalFont) => void;
  onBitmapImport?:(font:BitmapFontAsset)=>void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [license, setLicense] = useState(""),
    [fontError, setFontError] = useState("");
  const [sample, setSample] = useState(
    layer.text || "09:41 0123456789 -19.9°C -- 周五",
  );
  const [coverage, setCoverage] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    for (const f of [...libraryFonts, ...(project.localFonts || [])])
      void (async () => {
        try {
          const bytes = await fontBytes(project, f.file),
            face = await new FontFace("Library_" + f.id, bytes).load();
          document.fonts.add(face);
          const missing = missingGlyphs(bytes, sample);
          if (active)
            setCoverage((c) => ({
              ...c,
              [f.id]: missing.length
                ? "缺字：" + missing.join(" ")
                : "样本文字已覆盖",
            }));
        } catch {
          if (active)
            setCoverage((c) => ({ ...c, [f.id]: "未能检查，请在设备核对" }));
        }
      })();
    return () => {
      active = false;
    };
  }, [sample, project.localFonts]);
  const supported = ["text", "time", "date", "metric"].includes(layer.kind),
    pixels = Math.round((layer.size * deviceFor(project).pixels) / 454);
  return (
    <div className="font-library-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="字体素材库"
        className="font-library"
      >
        <header>
          <h2>字体素材库</h2>
          <button onClick={onClose}>关闭字体库</button>
        </header>
        <p>
          当前：{layer.name} · 设计字号 {layer.size} · 目标设备约 {pixels}
          px。系统字体实际尺寸由设备决定。
        </p>
        <label>
          搜索字体
          <input
            aria-label="搜索字体"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <label>
          检查文字
          <input
            aria-label="字体检查文字"
            maxLength={200}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
          />
        </label>
        <h3>项目本地字体</h3>
        <p>
          字体保存在当前浏览器；编译仅发送生成后的字形资源，源码导出保留字体及许可。字体字重由实际文件决定。
        </p>
        {onImport && (
          <>
            <label>
              字体许可或授权说明
              <textarea
                aria-label="字体许可或授权说明"
                maxLength={100000}
                value={license}
                onChange={(e) => setLicense(e.target.value)}
              />
            </label>
            <label>
              导入TTF/OTF
              <input
                aria-label="导入本地字体"
                type="file"
                accept=".ttf,.otf"
                disabled={!supported || !license.trim()}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const f = await importLocalFont(file, license);
                    onImport(f);
                    setFontError("");
                    onClose();
                  } catch (err) {
                    setFontError((err as Error).message);
                  }
                }}
              />
            </label>
          </>
        )}
        {onBitmapImport&&<label>导入FNT＋PNG<input aria-label="导入位图字体" type="file" multiple accept=".fnt,.png" disabled={!supported||!license.trim()} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;try{const font=await importBitmapFont(files,license);onBitmapImport(font);setFontError("");onClose();}catch(error){setFontError((error as Error).message);}}}/><small>单页Unicode BMFont文本＋8位灰度PNG；固定像素，不任意缩放。图片仅保存在本机浏览器。</small></label>}
        <div className="inline">{[["时间","09:41"],["日期","TUE 12"],["负温度","-19.9°C"],["长里程","999.99km"],["中文","周五"],["缺失","--"]].map(([label,value])=><button type="button" key={label} onClick={()=>setSample(value)}>{label}样本</button>)}</div>
        {(project.bitmapFonts||[]).map(f=>{const info=bitmapFontInfo(f),missing=bitmapGlyphMissing(info,sample);return <article key={f.id}><b>{f.family} · 位图 {info.size}px</b><svg width="100%" height="85" viewBox="0 0 700 85"><BitmapFontText project={project} layer={{...layer,...bitmapTypographyReset,bitmapFontId:f.id,x:0,y:0,w:700,h:85,textAlign:"left"}} text={sample} color="#dce9f0"/></svg><p role="status">{missing.length?"缺字："+missing.join(" "):"样本文字已覆盖"}</p><small>{Object.keys(info.glyphs).length}字形 · 行高{info.lineHeight}px / 基线{info.base}px · {info.kernings.length}字偶距 · 图集{info.width}×{info.height}</small><button disabled={!supported} onClick={()=>{onApply(bitmapLayerPatch(project,f.id));onClose();}}>应用位图{f.family}</button></article>;})}
        {fontError && <p role="alert">{fontError}</p>}
        {(project.localFonts || []).map((f) => (
          <article key={f.id}>
            <b>{f.family}</b>
            <div style={{ fontFamily: "Library_" + f.id, fontSize: 30 }}>
              {sample}
            </div>
            <p role="status">{coverage[f.id] || "检查字符中…"}</p>
            <small> {Math.round((f.data.length * 0.75) / 1024)} KB</small>
            <button
              disabled={!supported}
              onClick={() => {
                onApply({
                  ...bitmapTypographyReset,bitmapFontId:undefined,
                  customFont: { id: f.id, family: f.family, file: f.file },
                  fontWeight: 400,
                  garminFont: "auto",
                });
                onClose();
              }}
            >
              应用{f.family}
            </button>
          </article>
        ))}
        <h3>资源库字体</h3>
        <p>
          使用实际字体预览并读取字符表检查样本；生成时仍按目标尺寸转换为
          FNT/PNG，许可证随源码导出。
        </p>
        <div className="font-cards">
          {libraryFonts
            .filter((f) =>
              (f.name + f.family + f.usage)
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((f) => (
              <article key={f.id}>
                <b>{f.name}</b>
                <small>
                  {f.family} · {f.usage} · {f.license}
                </small>
                <div
                  style={{ fontFamily: '"Library_' + f.id + '"', fontSize: 30 }}
                >
                  {sample}
                </div>
                <p role="status">{coverage[f.id] || "检查字符中…"}</p>
                <button
                  disabled={!supported}
                  onClick={() => {
                    onApply(fontPatch(f.id));
                    onClose();
                  }}
                >
                  应用{f.name}
                </button>
              </article>
            ))}
        </div>
        <h3>设备系统字体</h3>
        <p>
          网页使用替代字体；中文字形与尺寸需在目标设备验证，不提取或分发SDK字体。
        </p>
        <div className="font-system">
          {(
            [
              "auto",
              "xtiny",
              "systemXTiny",
              "tiny",
              "small",
              "medium",
              "large",
              "numberHot",
            ] as const
          ).map((id) => (
            <button
              key={id}
              onClick={() => {
                onApply({ garminFont: id, customFont: undefined });
                onClose();
              }}
            >
              {id}
            </button>
          ))}
        </div>
        {!supported && (
          <p>
            当前控件仅支持设备系统字体；资源库字体适用于时间、日期、数据和文字。
          </p>
        )}
      </section>
    </div>
  );
}
