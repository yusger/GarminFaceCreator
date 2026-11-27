import {currentApproximationReceipt,currentGenerationContext} from "./generationContext";
import DeviceEvidence from "./DeviceEvidence";
import { useMemo } from "react";
import type { Project } from "./domain";
import { generationDiagnostics } from "./generationDiagnostics";
const labels = {
  unsupported: "阻止本地生成",
  approximation: "显示近似",
  unverified: "待验证",
};
export default function GenerationChecks({
  project,
  onLocate,
}: {
  project: Project;
  onLocate: (id: string) => void;
}) {
  const issues = useMemo(() => generationDiagnostics(project), [project]);
  const receiptCurrent=useMemo(()=>currentApproximationReceipt(project),[project]);
  const mappedCurrent=useMemo(()=>project.codeProvenance?.primary==="deterministic" && !project.codeProvenance.patches?.length && currentGenerationContext(project),[project]);
  const blocked = issues.filter((d) => d.status === "unsupported").length;
  return (
    <details className="boundary-warning" data-generation-checks>
      <summary>
        生成检查 · {blocked ? `${blocked} 项阻断` : "未发现映射阻断"}
      </summary>
      <p className="hint">
        检查本地生成映射与配置选项；不代替SDK编译、资源预算或真机验收。显示近似不代表已接受降级。
      </p>
      {mappedCurrent && <p data-diagnostic-status="supported">本地映射：已有与当前设计匹配的确定性工程；SDK、模拟器和真机仍分别核验。</p>}
      {project.codeProvenance?.acceptedApproximations && <p data-approximation-receipt className="hint">{receiptCurrent?"当前已应用工程已记录所列近似；仍需SDK和原生核对。":"已有近似记录仅对应历史设计或代码，当前设计需重新检查。"}</p>}
      <DeviceEvidence project={project}/>
      {issues.map((d, i) => {
        const accepted=d.status==="approximation" && receiptCurrent && project.codeProvenance!.acceptedApproximations!.items.some(item=>item.code===d.code && item.path===d.path && item.layerId===d.layerId);
        return <div key={i} data-diagnostic-status={accepted?"degraded":d.status}>
          <p>
            <b>{accepted?"本版本已采用近似":labels[d.status]}</b> · {d.message}
          </p>
          {d.layerId && (
            <button type="button" onClick={() => onLocate(d.layerId!)}>
              定位{" "}
              {project.layers.find((l) => l.id === d.layerId)?.name || "控件"}
            </button>
          )}
        </div>;
      })}
    </details>
  );
}
