import type { Layer } from "./domain";
export function ringProgress(
  l: Layer,
  value: unknown,
  missing = false,
  aod = false,
) {
  const source = l.ringSource || "seconds";
  if (aod || (missing && source !== "static")) return 0;
  const n = source === "static" ? 1 : value;
  if (
    typeof n !== "number" ||
    !Number.isFinite(n) ||
    n < 0 ||
    n >= 1e12 ||
    (source === "battery" && n > 100) ||
    (source === "heartRate" && n <= 0)
  )
    return 0;
  const goal =
    source === "static"
      ? 1
      : l.ringGoal ||
        (source === "seconds"
          ? 60
          : source === "steps"
            ? 10000
            : source === "battery"
              ? 100
              : 180);
  return Math.max(0, Math.min(1, n / goal));
}
export function arcBands(
  w: number,
  h: number,
  start: number,
  end: number,
  thickness: number,
) {
  const sweep = end - start,
    count = Math.max(1, Math.ceil(Math.abs(sweep) / 3)),
    rx = w / 2,
    ry = h / 2,
    t = Math.min(thickness, rx, ry);
  if (Math.abs(sweep) < 1e-9) return [];
  const point = (a: number, x: number, y: number) => {
    const r = (a * Math.PI) / 180;
    return [rx + Math.sin(r) * x, ry - Math.cos(r) * y];
  };
  return Array.from({ length: count }, (_, i) => {
    const a = start + (sweep * i) / count,
      b = start + (sweep * (i + 1)) / count;
    return [
      point(a, rx, ry),
      point(b, rx, ry),
      point(b, rx - t, ry - t),
      point(a, rx - t, ry - t),
    ];
  });
}
export function arcCaps(
  w: number,
  h: number,
  start: number,
  end: number,
  thickness: number,
) {
  const t = Math.min(thickness, w / 2, h / 2);
  return [start, end].map((a) => {
    const r = (a * Math.PI) / 180;
    return {
      x: w / 2 + Math.sin(r) * (w / 2 - t / 2),
      y: h / 2 - Math.cos(r) * (h / 2 - t / 2),
      r: t / 2,
    };
  });
}
export const nativeArcMethod = `function drawArcBand(dc,x,y,w,h,start,end,thick,ink,alpha,roundCap){
 var span=(end-start)*1.0;if(Math.abs(span)<0.000001){return;}var count=Math.ceil(Math.abs(span)/3.0).toNumber();if(count<1){count=1;}
 var rx=w/2.0;var ry=h/2.0;var t=thick;if(t>rx){t=rx;}if(t>ry){t=ry;}
 dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));
 if(alpha==255){dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}
 for(var i=0;i<count;i++){var a=(start+span*i/count)*Math.PI/180.0;var b=(start+span*(i+1)/count)*Math.PI/180.0;
 var poly=[[px(x+rx+Math.sin(a)*rx),px(y+ry-Math.cos(a)*ry)],[px(x+rx+Math.sin(b)*rx),px(y+ry-Math.cos(b)*ry)],[px(x+rx+Math.sin(b)*(rx-t)),px(y+ry-Math.cos(b)*(ry-t))],[px(x+rx+Math.sin(a)*(rx-t)),px(y+ry-Math.cos(a)*(ry-t))]];dc.fillPolygon(poly);}
 if(roundCap && Math.abs(span)<360){for(var j=0;j<2;j++){var angle=(j==0?start:end)*Math.PI/180.0;dc.fillCircle(px(x+rx+Math.sin(angle)*(rx-t/2.0)),px(y+ry-Math.cos(angle)*(ry-t/2.0)),px(t/2.0));}}
}
function drawProgressArc(dc,x,y,w,h,start,end,thick,ink,dim,value,goal,battery,hr,low,roundCap){
 drawArcBand(dc,x,y,w,h,start,end,thick,ink,(dim*255).toNumber(),roundCap);
 if(!low && value!=null && value==value && value>=0 && value<1.0e12 && (!battery || value<=100) && (!hr || value>0)){
 var progress=value>=goal?1.0:value*1.0/goal;drawArcBand(dc,x,y,w,h,start,start+(end-start)*progress,thick,ink,255,roundCap);}
}`;
