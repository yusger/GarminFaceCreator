import type {Layer} from "./domain";
export const CURVE_ERROR_PX=0.5;
// Error bounds cover chord approximation before native pixel quantization.
// Bounded polygons are a platform budget, not a universal device memory promise.
export function curveSampling(radiusPx:number,sweepDegrees:number,minSegments:number,maxSegments:number) {
  if(!Number.isFinite(radiusPx)||radiusPx<0||!Number.isFinite(sweepDegrees)||minSegments<1||maxSegments<minSegments)throw Error("曲线细分参数无效");
  const sweep=Math.abs(sweepDegrees)*Math.PI/180;
  const step=radiusPx>CURVE_ERROR_PX?2*Math.acos(1-CURVE_ERROR_PX/radiusPx):Math.PI;
  const requested=Math.max(minSegments,Math.ceil(sweep/step));
  const segments=Math.min(maxSegments,requested);
  return {segments,requested,errorPx:radiusPx*(1-Math.cos(sweep/(2*segments))),capped:requested>maxSegments};
}
export function primitiveSampling(l:Pick<Layer,"kind"|"w"|"h"|"cornerRadius">,scale:number) {
  if(!Number.isFinite(scale)||scale<=0)throw Error("目标像素比例无效");
  if(l.kind==="circle")return curveSampling(Math.max(l.w,l.h)*scale/2,360,12,64);
  const radius=Math.max(0,Math.min(l.cornerRadius??4,l.w/2,l.h/2));
  return curveSampling(radius*scale,90,1,15);
}
export function primitivePoints(l:Layer,scale:number):number[][] {
  if(l.kind==="polygon")return l.polygonPoints!.map(([x,y])=>[l.x+x*l.w,l.y+y*l.h]);
  const count=primitiveSampling(l,scale).segments;
  if(l.kind==="circle")return Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return [l.x+l.w/2+Math.cos(a)*l.w/2,l.y+l.h/2+Math.sin(a)*l.h/2];});
  const r=Math.max(0,Math.min(l.cornerRadius??4,l.w/2,l.h/2));
  if(!r)return [[l.x,l.y],[l.x+l.w,l.y],[l.x+l.w,l.y+l.h],[l.x,l.y+l.h]];
  const points:number[][]=[];
  for(let c=0;c<4;c++)for(let i=0;i<=count;i++){
    const a=(-90+c*90+i*90/count)*Math.PI/180;
    const cx=c<2?l.x+l.w-r:l.x+r,cy=c===0||c===3?l.y+r:l.y+l.h-r;
    points.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);
  }
  return points;
}
