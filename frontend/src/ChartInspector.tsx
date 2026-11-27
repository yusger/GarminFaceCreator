import type {Layer} from "./domain";
import {chartConfig,chartSizeWarning,type ChartConfig,type ChartPreviewCase} from "./charts";
export default function ChartInspector({layer:l,onChange,previewCase,onPreview}:{layer:Layer;onChange:(p:Partial<Layer>)=>void;previewCase?:ChartPreviewCase;onPreview:(v:ChartPreviewCase)=>void}){
 const c=chartConfig(l),set=(p:Partial<ChartConfig>)=>onChange({chart:{...c,...p}}),warn=chartSizeWarning(l);
 const select=(label:string,key:keyof ChartConfig,values:[string,string][]) => <label>{label}<select aria-label={label} value={String(c[key])} onChange={e=>set({[key]:key==="precision"&&e.target.value!=="auto"?Number(e.target.value):e.target.value})}>{values.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>;
 const number=(label:string,key:keyof ChartConfig,min:number,max:number,step=1)=><label key={key}>{label}<input aria-label={label} type="number" value={Number(c[key])} min={min} max={max} step={step} onChange={e=>{const v=Number(e.target.value);if(Number.isFinite(v))set({[key]:Math.min(max,Math.max(min,["length","segments"].includes(key)?Math.round(v):v))});}}/></label>;
 return <fieldset><legend>历史图表</legend><label>图表数据<select aria-label="图表数据" value={l.source} onChange={e=>onChange({source:e.target.value})}><option value="steps">每日步数</option><option value="distance">每日活动距离（km）</option><option value="calories">每日总热量（kcal）</option></select></label><label>时间单位<select aria-label="图表时间单位" value="day" onChange={()=>{}}><option value="day">天</option><option value="hour" disabled>小时（后续阶段）</option></select></label>{number("图表时间长度","length",1,7)}
 {select("图表样式","style",[["bar","柱状图"],["trapezoid","梯形图"],["segmented","分段柱"]])}
 <label>图表标题<input aria-label="图表标题" value={c.title} maxLength={48} placeholder="跟随数据来源" onChange={e=>set({title:e.target.value})}/></label>
 {([["includeCurrent","包含未结束的今天"],["showTitle","显示标题"],["showIcon","显示来源图标"],["showLabels","显示日期标签"],["showValues","显示每柱读数"],["showCoverage","显示记录覆盖数"],["showAxes","显示坐标轴"],["compact","缩写大数"],["showGoal","显示参考目标线"]] as const).map(([k,title])=><label className="inline" key={k}><input type="checkbox" aria-label={title} checked={c[k]} onChange={e=>set({[k]:e.target.checked})}/>{title}</label>)}
 {select("图表统计","summary",[["none","无"],["latest","最新值"],["mean","有效记录均值"],["max","有效记录最大值"],["sum","有效记录总和"]])}
 {select("图表纵轴","axis",[["auto","自动"],["fixed","固定范围"]])}
 {c.axis==="fixed"&&<>{number("纵轴最小值","min",0,c.max-1)}{number("纵轴最大值","max",c.min+1,1e9)}</>}
 {select("图表精度","precision",[["auto","自动"],["0","0 位"],["1","1 位"],["2","2 位"]])}
 {number("柱间距","gap",0,20)}{number("柱圆角","barRadius",0,20)}{c.style==="trapezoid"&&number("梯形顶宽比例","trapezoidTop",0,1,.05)}{c.style==="segmented"&&<>{number("每柱分段数","segments",1,16)}{number("段间距","segmentGap",0,12)}</>}
 {c.showGoal&&number("参考目标","goal",0,1e9)}
 {([["dimColor","图表暗色"],["goalColor","参考线颜色"]] as const).map(([k,title])=><label key={k}>{title}<input aria-label={title} type="color" value={c[k]} onChange={e=>set({[k]:e.target.value})}/></label>)}
 <label>图表预览样例<select aria-label="图表预览样例" value={previewCase||"normal"} onChange={e=>onPreview(e.target.value as ChartPreviewCase)}>{[["normal","示意记录"],["zero","真实零值"],["missing","全部缺失"],["partial","部分缺失"],["extreme","极值"]].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 {warn&&<p role="status">{warn}</p>}<p className="hint">网页历史为示意样本，不会导出为传感器数据。Garmin 最多提供7条每日历史，不保证齐全；热量为总热量。缺失留空，零值标点；今天有下划线。AOD 使用最近亮屏缓存并简化成柱状，不读取新历史。首批原生支持 Venu 4 两尺寸，每表盘最多4个图表。</p></fieldset>;
}
