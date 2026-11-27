import { expandWidgets } from "./compound.ts";
import type { Project, CodeFile } from "./domain.ts";
import { suncalcLicense } from "./suncalcNotice.ts";
export function needsNativeMoon(p: Project) {
  p = expandWidgets(p);
  return (
    p.layers.some(
      (l) =>
        l.exportIncluded !== false &&
        (l.kind === "moon" ||
          (l.source === "moonIllumination" &&
            (l.kind === "metric" || l.kind === "meter"))),
    ) ||
    (p.controls || []).some(
      (c) => c.type === "dataSource" && c.options?.includes("moonIllumination"),
    )
  );
}
export function nativeMoonFiles(p: Project): CodeFile[] {
  if (!needsNativeMoon(p)) return [];
  return [
    {
      path: "source/GfcMoon.mc",
      content: `/* SunCalc 1.9.0 illumination equations adapted for GarminFaceCreator.
${suncalcLicense}*/
import Toybox.Math;import Toybox.Time;import Toybox.Graphics;
class GfcMoon {
 static var stamp=-1;static var cached=null;
 static function ra(l,b,e){return Math.atan2(Math.sin(l)*Math.cos(e)-Math.tan(b)*Math.sin(e),Math.cos(l));}
 static function dec(l,b,e){return Math.asin(Math.sin(b)*Math.cos(e)+Math.cos(b)*Math.sin(e)*Math.sin(l));}
 static function calculate(seconds){if(seconds<946684800||seconds>=2145916800){return null;}var pi=3.141592653589793;var rad=pi/180.0;var d=seconds.toDouble()/86400.0-10957.5;var e=23.4397*rad;
 var sm=rad*(357.5291+0.98560028*d);var sl=sm+rad*(1.9148*Math.sin(sm)+0.02*Math.sin(2*sm)+0.0003*Math.sin(3*sm)+102.9372)+pi;
 var ml=rad*(218.316+13.176396*d);var mm=rad*(134.963+13.064993*d);var mf=rad*(93.272+13.229350*d);var lon=ml+rad*6.289*Math.sin(mm);var lat=rad*5.128*Math.sin(mf);var dist=385001-20905*Math.cos(mm);
 var sd=dec(sl,0,e);var sr=ra(sl,0,e);var md=dec(lon,lat,e);var mr=ra(lon,lat,e);var cosine=Math.sin(sd)*Math.sin(md)+Math.cos(sd)*Math.cos(md)*Math.cos(sr-mr);if(cosine>1){cosine=1;}if(cosine< -1){cosine=-1;}var sep=Math.acos(cosine);var inc=Math.atan2(149598000*Math.sin(sep),dist-149598000*Math.cos(sep));var angle=Math.atan2(Math.cos(sd)*Math.sin(sr-mr),Math.sin(sd)*Math.cos(md)-Math.cos(sd)*Math.sin(md)*Math.cos(sr-mr));return [0.5+0.5*inc*(angle<0?-1:1)/pi,(1+Math.cos(inc))/2];}
 static function read(low){if(low){return cached;}var now=Time.now().value();var anchor=(now/600).toNumber()*600;if(stamp!=anchor){cached=calculate(anchor);stamp=anchor;}return cached;}
 static function draw(dc,x,y,w,h,ink,dark,south,low){var m=read(low);var r=Math.min(w,h)*0.45;var cx=x+w/2.0;var cy=y+h/2.0;dc.setPenWidth(1);dc.setColor(dark,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(dark>>16)&255,(dark>>8)&255,dark&255));dc.setStroke(Graphics.COLOR_TRANSPARENT);dc.setColor(dark,Graphics.COLOR_TRANSPARENT);if(!low){dc.fillCircle(cx,cy,r);}dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.COLOR_TRANSPARENT);dc.setColor(ink,Graphics.COLOR_TRANSPARENT);
 if(m==null){dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.drawLine(cx-r*0.7,cy-r*0.7,cx+r*0.7,cy+r*0.7);}else{var points=[];var mirror=(m[0]<0.5?1:-1)*(south?-1:1);var k=Math.cos(2*3.141592653589793*m[0]);for(var i=0;i<=24;i++){var t=-3.141592653589793/2+i*3.141592653589793/24;points.add([cx+mirror*Math.cos(t)*r,cy+Math.sin(t)*r]);}for(var j=24;j>=0;j--){var t=-3.141592653589793/2+j*3.141592653589793/24;points.add([cx+mirror*k*Math.cos(t)*r,cy+Math.sin(t)*r]);}if(low){dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);if(m[1]>=0.995){dc.drawCircle(cx,cy,r*0.55);}else if(m[1]>0.005){for(var j=26;j<points.size();j++){dc.drawLine(points[j-1][0],points[j-1][1],points[j][0],points[j][1]);}}}else{dc.setStroke(Graphics.COLOR_TRANSPARENT);dc.fillPolygon(points);}}
 dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.drawCircle(cx,cy,r);}
}
`,
    },
  ];
}
export function mergeNativeMoon(p: Project, files: CodeFile[]) {
  const managed = nativeMoonFiles(p);
  return [
    ...files.filter((f) => !managed.some((m) => m.path === f.path)),
    ...managed,
  ];
}
