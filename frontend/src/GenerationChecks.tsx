import {currentApproximationReceipt} from "./generationContext";
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
  const blocked = issues.filter((d) => d.status === "unsupported").length;
  return (
    <details className="boundary-warning" data-generation-checks>
      <summary>
        生成检查 · {blocked ? `${blocked} 项阻断` : "未发现映射阻断"}
      </summary>
      <p className="hint">
        检查本地生成映射与配置选项；不代替SDK编译、资源预算或真机验收。显示近似不代表已接受降级。
      </p>
      {project.codeProvenance?.acceptedApproximations && <p data-approximation-receipt className="hint">{currentApproximationReceipt(project)?"当前已应用工程已记录所列近似；仍需SDK和原生核对。":"已有近似记录仅对应历史设计或代码，当前设计需重新检查。"}</p>}
      <DeviceEvidence project={project}/>
      {issues.map((d, i) => (
        <div key={i} data-diagnostic-status={d.status}>
          <p>
            <b>{labels[d.status]}</b> · {d.message}
          </p>
          {d.layerId && (
            <button type="button" onClick={() => onLocate(d.layerId!)}>
              定位{" "}
              {project.layers.find((l) => l.id === d.layerId)?.name || "控件"}
            </button>
          )}
        </div>
      ))}
    </details>
  );
}
