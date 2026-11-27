import { useState } from "react";
import type { Project } from "./domain";
import { upgradeThemeDefinition, themeUpgradeBase } from "./themeUpgrade";
export default function ThemeUpgradePanel({
  project,
  onChange,
}: {
  project: Project;
  onChange: (p: Project) => void;
}) {
  const [pending, setPending] =
      useState<ReturnType<typeof upgradeThemeDefinition>>(),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  return (
    <details>
      <summary>更新主题定义</summary>
      <p>
        导入同一来源、相同型号尺寸的更高版本设计JSON。应用后替换整套布局、素材和字体，保留兼容颜色、数据、开关及各主题背景覆盖。手动布局调整会被替换；可以撤销。不会导入更新文件中的代码或执行脚本。
      </p>
      <label>
        检查主题更新
        <input
          aria-label="检查主题更新"
          type="file"
          accept=".json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            setPending(undefined);
            setStatus("");
            if (!file) return;
            try {
              if (file.size > 20 * 1024 * 1024)
                throw Error("主题定义文件上限20MB");
              setPending(
                upgradeThemeDefinition(project, JSON.parse(await file.text())),
              );
              setError("");
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        />
      </label>
      {pending && (
        <div role="group" aria-label="主题更新预检">
          <ul>
            {pending.versions.map((v) => (
              <li key={v.id}>
                {v.id}：{v.from || "新增"} → {v.to}
              </li>
            ))}
          </ul>
          <p>保留 {pending.retained.length} 项自定义配置</p>
          {pending.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
          <button
            type="button"
            onClick={() => {
              try {
                if (themeUpgradeBase(project) !== pending.base)
                  throw Error("项目已修改，请重新检查更新文件");
                onChange(pending.project);
                setPending(undefined);
                setError("");
                setStatus("主题定义已更新，兼容自定义值已保留");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            应用主题更新
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </details>
  );
}
