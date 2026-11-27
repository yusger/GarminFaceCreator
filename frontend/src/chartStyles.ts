import type {Layer} from "./domain";
import {defaultThresholds} from "./thresholds";
export function chartPointInk(l:Layer,value:number|null,aod=false){if(aod)return l.aodColor||"#777777";if(!l.threshold)return l.color;const rule=(l.thresholdRules??defaultThresholds(l.source,l.color)).find(r=>value!==null&&value>=(r.min??-Infinity)&&value<(r.max??Infinity));return rule?.color||l.thresholdFallback||l.color;}
// Adjacent pairs only: a null point never creates a connecting line or filled area.
export function chartEdges(points:{value:number|null}[]){return points.flatMap((p,i)=>i>0&&p.value!==null&&points[i-1].value!==null?[[i-1,i] as const]:[]);}
