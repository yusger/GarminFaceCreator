import {
  bitmapFontInfo,
  bitmapRequiredGlyphs,
  usedBitmapFonts,
} from "./bitmapFonts.ts";
import type { Project, CodeFile } from "./domain.ts";
// Compact, sorted codes/advances preserve the FNT metrics without a hash-table entry per glyph.
export function nativeBitmapFontPlans(p: Project) {
  return usedBitmapFonts(p).map((f) => {
    const info = bitmapFontInfo(f),
      required = new Set(
        [...bitmapRequiredGlyphs(p, f.id)].map((c) => c.codePointAt(0)!),
      ),
      glyphs = Object.values(info.glyphs)
        .filter((g) => required.has(g.id))
        .sort((a, b) => a.id - b.id),
      pairs = new Map<number, [number, number][]>();
    for (const k of info.kernings)
      if (required.has(k.first) && required.has(k.second))
        pairs.set(k.first, [
          ...(pairs.get(k.first) || []),
          [k.second, k.amount],
        ]);
    return {
      id: f.id,
      size: info.size,
      height: info.lineHeight,
      digits: Math.max(
        0,
        ...Array.from(
          { length: 10 },
          (_, i) => info.glyphs[48 + i]?.xadvance || 0,
        ),
      ),
      codes: glyphs.map((g) => g.id),
      widths: glyphs.map((g) => g.xadvance),
      pairs: [...pairs],
    };
  });
}
export function nativeBitmapFontFiles(p: Project): CodeFile[] {
  const plans = nativeBitmapFontPlans(p);
  if (!plans.length) return [];
  const methods = plans.map((f, i) => {
    const pairs =
      "{" +
      f.pairs
        .map(
          ([a, values]) =>
            a + "=>{" + values.map(([b, k]) => b + "=>" + k).join(",") + "}",
        )
        .join(",") +
      "}";
    return ` static function info_${i}(){return {:size=>${f.size},:height=>${f.height},:digits=>${f.digits},:codes=>${JSON.stringify(f.codes)},:widths=>${JSON.stringify(f.widths)},:pairs=>${pairs}};}`;
  });
  const dispatch = plans
    .map(
      (f, i) =>
        (i ? "else " : "") +
        `if(id.equals(${JSON.stringify(f.id)})){lastInfo=info_${i}();}`,
    )
    .join("");
  return [
    {
      path: "source/GfcBitmapText.mc",
      content: `import Toybox.Graphics;import Toybox.Lang;
// Venu 4 SDK9.3: measured drawText top inset is 1px; other targets are gated.
// Keep ONE small metrics record. Do not initialize every theme/font dictionary at startup.
class GfcBitmapText {
 static var lastId=null;static var lastInfo=null;
${methods.join("\n")}
 static function infoFor(id){if(lastId!=null && id.equals(lastId)){return lastInfo;}lastId=null;lastInfo=null;${dispatch}else{throw new Lang.InvalidValueException("Unknown bitmap font");}lastId=id;return lastInfo;}
 static function glyphIndex(info,c){var codes=info[:codes];var lo=0;var hi=codes.size()-1;while(lo<=hi){var mid=((lo+hi)/2.0).toNumber();if(codes[mid]==c){return mid;}if(codes[mid]<c){lo=mid+1;}else{hi=mid-1;}}return -1;}
 static function digit(c){return c>=48 && c<=57;}
 static function pair(pairs,a,b,tabular){if(tabular && (digit(a)||digit(b))){return 0;}return pairs.hasKey(a)&&pairs[a].hasKey(b)?pairs[a][b]:0;}
 static function advance(info,c,tabular){if(tabular && digit(c)){return info[:digits];}var index=glyphIndex(info,c);return index>=0?info[:widths][index]:(info[:size]/2.0+0.5).toNumber();}
 // Backward compatible public draw interface.
 static function draw(dc,x,y,w,h,font,id,text,align){drawDetailed(dc,x,y,w,h,font,id,text,align,0,false,0,0);}
 static function drawDetailed(dc,x,y,w,h,font,id,text,align,tracking,tabular,baseline,lineHeight){var info=infoFor(id);var chars=text.toCharArray();var pairs=info[:pairs];var total=0;var prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0){total+=pair(pairs,prev,c,tabular)+tracking;}total+=advance(info,c,tabular);prev=c;}
 var start=(x+(align.equals("left")?0:(align.equals("right")?w-total:(w-total)/2.0))).toNumber();var height=lineHeight>0?lineHeight:info[:height];var top=(y+(h-height)/2.0).toNumber()+baseline-1;prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0){start+=pair(pairs,prev,c,tabular)+tracking;}if(glyphIndex(info,c)>=0){var offset=tabular&&digit(c)?((info[:digits]-advance(info,c,false))/2.0).toNumber():0;dc.drawText(start+offset,top,font,chars[i].toString(),Graphics.TEXT_JUSTIFY_LEFT);}else{var fallback=(info[:size]/2.0+0.5).toNumber();dc.drawRectangle(start,top,fallback,info[:height]);}start+=advance(info,c,tabular);prev=c;}}
}
`,
    },
  ];
}
