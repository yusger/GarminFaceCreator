import type { Layer } from "./domain";
export function curvedLayout(l: Layer, widths: number[]) {
  const radius = Math.min(l.w, l.h) * (l.arcRadius ?? 0.4),
    spacing = l.arcSpacing ?? 0,
    n = widths.length,
    total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, n - 1),
    dir = l.arcDirection === "counterclockwise" ? -1 : 1;
  let distance =
    l.textAlign === "left" ? 0 : l.textAlign === "right" ? -total : -total / 2;
  return widths.map((width) => {
    const angle =
        (l.arcStartAngle ?? 0) +
        (((dir * (distance + width / 2)) / radius) * 180) / Math.PI,
      rad = (angle * Math.PI) / 180;
    distance += width + spacing;
    return {
      x: l.w / 2 + Math.sin(rad) * radius,
      y: l.h / 2 - Math.cos(rad) * radius,
      rotation: angle + (dir < 0 ? 180 : 0),
    };
  });
}
export const nativeCurvedText = `var arcFonts={};
function arcFont(size){var pixels=px(size);if(pixels<1){pixels=1;}var key=pixels.toString();
 if(!arcFonts.hasKey(key)){var f=Graphics.getVectorFont({:font=>Graphics.FONT_SMALL,:scale=>pixels*1.0/Graphics.getFontHeight(Graphics.FONT_SMALL)});if(f==null){throw new Lang.InvalidValueException("Required arc vector font unavailable");}arcFonts[key]=f;}return arcFonts[key];}
function drawCurvedLabel(dc,x,y,w,h,ratio,start,forward,spacing,size,ink,text,align){
 if(text.length()==0){return;}if(!(Graphics has :getVectorFont) || !(dc has :drawAngledText)){throw new Lang.InvalidValueException("Required arc text API unavailable");}
 var font=arcFont(size);var radius=(w<h?w:h)*ratio;var widths=[];var total=0.0;
 for(var i=0;i<text.length();i++){var width=dc.getTextWidthInPixels(text.substring(i,i+1),font)*1.0/scale;widths.add(width);total+=width;}total+=spacing*(text.length()-1);
 if(total>2*Math.PI*radius){throw new Lang.InvalidValueException("Arc label exceeds one revolution");}
 var distance=align==0?0.0:align==2?-total:-total/2.0;var direction=forward?1.0:-1.0;
 dc.setColor(ink,Graphics.COLOR_TRANSPARENT);
 for(var j=0;j<widths.size();j++){var angle=start+direction*(distance+widths[j]/2.0)/radius*180.0/Math.PI;var a=angle*Math.PI/180.0;var rotation=angle+(forward?0:180);var apiAngle=-rotation;while(apiAngle<0){apiAngle+=360;}while(apiAngle>=360){apiAngle-=360;}
 dc.drawAngledText(px(x+w/2.0+Math.sin(a)*radius),px(y+h/2.0-Math.cos(a)*radius),font,text.substring(j,j+1),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER,apiAngle);distance+=widths[j]+spacing;}
}`;
