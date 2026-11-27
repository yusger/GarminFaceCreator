import {useId} from "react";
import type {Layer} from "./domain";
import type {Preview} from "./previewData";
import {fontFamily} from "./customFonts";
import {chartLayout,previewChart,chartSummary,chartNumber,chartTitle} from "./charts";
export default function ChartWidget({layer:l,preview,aod=false}:{layer:Layer;preview:Preview;aod?:boolean}){
 const id=useId().replaceAll(":",""),points=previewChart(l,preview.calendarDate||"2026-11-23",preview.missing?"missing":preview.chartCase),q=chartLayout(l,points,aod),{c,size,top,left,w,h,min,max,cell}=q,ink=aod?l.aodColor||"#777777":l.color,covered=points.filter(p=>p.value!==null).length,summary=chartSummary(points,c.summary),lineY=top+h;
 const icon=l.source==="steps"?<><ellipse cx="4" cy="10" rx="2" ry="3"/><ellipse cx="10" cy="7" rx="2" ry="3"/><circle cx="5" cy="4" r="1.4"/><circle cx="11" cy="1.5" r="1.4"/></>:l.source==="distance"?<polyline points="2,12 6,4 12,10 15,1" fill="none" stroke={ink} strokeWidth="1.5"/>:<polyline points="8,0 7,5 3,8 2,11 5,14 9,14 12,11 12,7 9,3 8,0" fill="none" stroke={ink} strokeWidth="1.5"/>;
 return <g data-history-chart="day-demo" opacity={l.opacity??1} fontFamily={fontFamily(l)} fontSize={size} fill={ink}><defs><clipPath id={id}><rect width={l.w} height={l.h}/></clipPath></defs><g clipPath={`url(#${id})`}>
 {c.showTitle&&<>{c.showIcon&&<g transform="translate(4,1)" fill={ink}>{icon}</g>}<text x={c.showIcon?24:4} y={size+1}>{c.title||chartTitle[l.source]}</text></>}
 {c.showAxes&&<><line x1={left} y1={top} x2={left} y2={lineY} stroke={c.dimColor}/><line x1={left} y1={lineY} x2={left+w} y2={lineY} stroke={c.dimColor}/><text x={left-3} y={top+size} textAnchor="end">{chartNumber(max,l.source,c)}</text><text x={left-3} y={lineY} textAnchor="end">{chartNumber(min,l.source,c)}</text></>}
 {c.showGoal&&c.goal>=min&&c.goal<=max&&<line x1={left} y1={lineY-q.ratio(c.goal)*h} x2={left+w} y2={lineY-q.ratio(c.goal)*h} stroke={aod?ink:c.goalColor} strokeDasharray="3 3"/>}
 {points.map((p,i)=>{const x=left+i*cell+Math.min(c.gap,cell*.8)/2,bw=Math.max(1,cell-Math.min(c.gap,cell*.8)),height=p.value===null?0:q.ratio(p.value)*h,style=aod?"bar":c.style;return <g key={p.date}>
 {p.value!==null&&(height>0?style==="trapezoid"?<polygon points={`${x},${lineY} ${x+(bw-bw*c.trapezoidTop)/2},${lineY-height} ${x+(bw+bw*c.trapezoidTop)/2},${lineY-height} ${x+bw},${lineY}`}/>:style==="segmented"?Array.from({length:c.segments},(_,j)=>{const sh=h/c.segments,gap=Math.min(c.segmentGap,sh*.8);return <rect key={j} x={x} y={lineY-(j+1)*sh} width={bw} height={sh-gap} fill={j<Math.floor(q.ratio(p.value!)*c.segments)?ink:c.dimColor}/>;}):<rect x={x} y={lineY-height} width={bw} height={height} rx={Math.min(c.barRadius,bw/2,height/2)}/>:<circle cx={x+bw/2} cy={lineY} r="1.4"/>)}
 {p.partial&&<line x1={x+bw/2-3} x2={x+bw/2+3} y1={lineY+3} y2={lineY+3} stroke={ink} strokeWidth="2"/>}
 {c.showValues&&!aod&&<text x={x+bw/2} y={Math.max(top+size,lineY-height-3)} textAnchor="middle">{chartNumber(p.value,l.source,c)}</text>}
 {c.showLabels&&<text x={x+bw/2} y={lineY+size+5} textAnchor="middle">{p.label}</text>}
 </g>;})}
 {!covered&&<text x={left+w/2} y={top+h/2} textAnchor="middle">--</text>}
 {(c.summary!=="none"||c.showCoverage)&&<text x={l.w/2} y={l.h-3} textAnchor="middle">{c.summary!=="none"?chartNumber(summary,l.source,c):""}{c.summary!=="none"&&c.showCoverage?"  |  ":""}{c.showCoverage?`${covered}/${points.length}`:""}</text>}
 </g></g>;
}
