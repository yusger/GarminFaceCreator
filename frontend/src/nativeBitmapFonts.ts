import {
  bitmapFontInfo,
  bitmapRequiredGlyphs,
  usedBitmapFonts,
} from "./bitmapFonts.ts";
import type { Project, CodeFile } from "./domain.ts";
export function nativeBitmapFontFiles(p: Project): CodeFile[] {
  const fonts = usedBitmapFonts(p);
  if (!fonts.length) return [];
  const dictionaries = fonts.map((f) => {
    const info = bitmapFontInfo(f),
      required = new Set(
        [...bitmapRequiredGlyphs(p, f.id)].map((c) => c.codePointAt(0)!),
      ),
      pairs = new Map<number, [number, number][]>();
    for (const k of info.kernings)
      if (required.has(k.first) && required.has(k.second))
        pairs.set(k.first, [
          ...(pairs.get(k.first) || []),
          [k.second, k.amount],
        ]);
    const advances =
        "{" +
        Object.values(info.glyphs)
          .filter((g) => required.has(g.id))
          .map((g) => g.id + "=>" + g.xadvance)
          .join(",") +
        "}",
      kerning =
        "{" +
        [...pairs]
          .map(
            ([a, values]) =>
              a + "=>{" + values.map(([b, k]) => b + "=>" + k).join(",") + "}",
          )
          .join(",") +
        "}";
    return (
      JSON.stringify(f.id) +
      "=>{:size=>" +
      info.size +
      ",:height=>" +
      info.lineHeight +
      ",:digits=>"+Math.max(0,...Array.from({length:10},(_,i)=>info.glyphs[48+i]?.xadvance||0))+
      ",:advances=>" +
      advances +
      ",:pairs=>" +
      kerning +
      "}"
    );
  });
  return [
    {
      path: "source/GfcBitmapText.mc",
      content: `import Toybox.Graphics;import Toybox.Lang;
// Venu 4 bitmap drawText has a measured 1px top inset (SDK 9.3); other targets are gated.
class GfcBitmapText {
 static var metrics={${dictionaries.join(",")}};
 static function digit(c){return c>=48 && c<=57;}
 static function pair(pairs,a,b,tabular){if(tabular && (digit(a)||digit(b))){return 0;}return pairs.hasKey(a)&&pairs[a].hasKey(b)?pairs[a][b]:0;}
 static function advance(info,c,tabular){if(tabular && digit(c)){return info[:digits];}var widths=info[:advances];return widths.hasKey(c)?widths[c]:(info[:size]/2.0+0.5).toNumber();}
 // Backward compatible entry point for existing generated projects.
 static function draw(dc,x,y,w,h,font,id,text,align){drawDetailed(dc,x,y,w,h,font,id,text,align,0,false,0,0);}
 static function drawDetailed(dc,x,y,w,h,font,id,text,align,tracking,tabular,baseline,lineHeight){var info=metrics[id];var chars=text.toCharArray();var widths=info[:advances];var pairs=info[:pairs];var total=0;var prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0){total+=pair(pairs,prev,c,tabular)+tracking;}total+=advance(info,c,tabular);prev=c;}
 var start=(x+(align.equals("left")?0:(align.equals("right")?w-total:(w-total)/2.0))).toNumber();var height=lineHeight>0?lineHeight:info[:height];var top=(y+(h-height)/2.0).toNumber()+baseline-1;prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0){start+=pair(pairs,prev,c,tabular)+tracking;}if(widths.hasKey(c)){var offset=tabular&&digit(c)?((info[:digits]-widths[c])/2.0).toNumber():0;dc.drawText(start+offset,top,font,chars[i].toString(),Graphics.TEXT_JUSTIFY_LEFT);}else{var fallback=(info[:size]/2.0+0.5).toNumber();dc.drawRectangle(start,top,fallback,info[:height]);}start+=advance(info,c,tabular);prev=c;}}

}
`,
    },
  ];
}
