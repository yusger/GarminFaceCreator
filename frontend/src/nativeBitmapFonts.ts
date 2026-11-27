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
class GfcBitmapText {
 static var metrics={${dictionaries.join(",")}};
 static function draw(dc,x,y,w,h,font,id,text,align){var info=metrics[id];var chars=text.toCharArray();var widths=info[:advances];var pairs=info[:pairs];var total=0;var prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0 && pairs.hasKey(prev) && pairs[prev].hasKey(c)){total+=pairs[prev][c];}total+=widths.hasKey(c)?widths[c]:(info[:size]/2.0+0.5).toNumber();prev=c;}
 var start=(x+(align.equals("left")?0:(align.equals("right")?w-total:(w-total)/2.0))).toNumber();var top=(y+(h-info[:height])/2.0).toNumber();prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0 && pairs.hasKey(prev) && pairs[prev].hasKey(c)){start+=pairs[prev][c];}if(widths.hasKey(c)){dc.drawText(start,top,font,chars[i].toString(),Graphics.TEXT_JUSTIFY_LEFT);start+=widths[c];}else{var fallback=(info[:size]/2.0+0.5).toNumber();dc.drawRectangle(start,top,fallback,info[:height]);start+=fallback;}prev=c;}}
}
`,
    },
  ];
}
