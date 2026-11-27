/** Same clockwise screen-space rotation as the SVG preview, about the layer center. */
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number,
): [number, number] {
  const a = (degrees * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}
export function layerTransform(l: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}) {
  return `translate(${l.x} ${l.y}) rotate(${l.rotation} ${l.w / 2} ${l.h / 2})`;
}

export function regularPolygon(count: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)];
  });
}
/** First polygon contract: finite normalized points, strictly convex, 3..32 vertices. */
export function validConvexPolygon(value: unknown): value is [number, number][] {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    value.length > 32 ||
    value.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        p.some(
          (n) => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1,
        ),
    )
  )
    return false;
  const p = value as number[][];
  // Every other vertex must lie strictly on the same side of each edge. Rejects crossings and duplicates.
  let sign = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    for (let j = 0; j < p.length; j++) {
      if (j === i || j === (i + 1) % p.length) continue;
      const c = p[j],
        cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cross) < 1e-8) return false;
      if (sign && Math.sign(cross) !== sign) return false;
      sign = Math.sign(cross);
    }
  }
  return true;
}

export type Point2=[number,number];
const cross=(a:Point2,b:Point2,c:Point2)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const EPS=1e-8;
export function polygonArea(p:Point2[]){return p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2;}
function onSegment(a:Point2,b:Point2,c:Point2){return Math.abs(cross(a,b,c))<=EPS&&c[0]>=Math.min(a[0],b[0])-EPS&&c[0]<=Math.max(a[0],b[0])+EPS&&c[1]>=Math.min(a[1],b[1])-EPS&&c[1]<=Math.max(a[1],b[1])+EPS;}
function intersects(a:Point2,b:Point2,c:Point2,d:Point2){const ac=cross(a,b,c),ad=cross(a,b,d),ca=cross(c,d,a),cb=cross(c,d,b);return ac*ad<0&&ca*cb<0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
/** Simple closed outline, no holes/crossings/contacts or adjacent collinear vertices. */
export function validPolygon(value:unknown):value is Point2[]{
 if(!Array.isArray(value)||value.length<3||value.length>32||value.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=="number"||!Number.isFinite(n)||n<0||n>1)))return false;
 const p=value as Point2[],n=p.length;if(Math.abs(polygonArea(p))<EPS)return false;
 for(let i=0;i<n;i++){
  if(Math.abs(cross(p[(i+n-1)%n],p[i],p[(i+1)%n]))<EPS)return false;
  for(let j=i+1;j<n;j++){if(Math.hypot(p[i][0]-p[j][0],p[i][1]-p[j][1])<EPS)return false;if(j===i+1||i===0&&j===n-1)continue;if(intersects(p[i],p[(i+1)%n],p[j],p[(j+1)%n]))return false;}
 }
 return true;
}
/** Ear clipping at generation time, max30 triangles; original boundary alone is stroked. */
export function triangulatePolygon(p:Point2[]):number[][]{
 if(!validPolygon(p))throw Error("多边形轮廓无效");const sign=Math.sign(polygonArea(p)),indices=p.map((_,i)=>i),out:number[][]=[];
 const inside=(a:Point2,b:Point2,c:Point2,v:Point2)=>[cross(a,b,v),cross(b,c,v),cross(c,a,v)].every(n=>n*sign>=-EPS);
 while(indices.length>3){let found=false;for(let i=0;i<indices.length;i++){const a=indices[(i+indices.length-1)%indices.length],b=indices[i],c=indices[(i+1)%indices.length];if(cross(p[a],p[b],p[c])*sign<=EPS||indices.some(v=>v!==a&&v!==b&&v!==c&&inside(p[a],p[b],p[c],p[v])))continue;out.push([a,b,c]);indices.splice(i,1);found=true;break;}if(!found)throw Error("多边形无法在预算内分解");}
 out.push(indices.slice());return out;
}
