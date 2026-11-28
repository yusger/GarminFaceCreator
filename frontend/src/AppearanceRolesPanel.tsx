import { useState } from "react";
import type { Project } from "./domain";
import { uid } from "./domain";
import { themeLayers, themeControls, activeTheme } from "./themes";
import { approvedFontChoices } from "./fontChoices";
import { createFontRole, setFontRole, detachFontRole } from "./fontRoles";
import {
  colorRoleKinds,
  setColorRoleSemantic,
  detachColorTarget,
} from "./colorRoles";
export default function AppearanceRolesPanel({
  project: p,
  onChange,
}: {
  project: Project;
  onChange: (p: Project) => void;
}) {
  const [name, setName] = useState("文字字体"),
    [font, setFont] = useState("sonar_label_font"),
    [members, setMembers] = useState<string[]>([]),
    [error, setError] = useState("");
  const options = approvedFontChoices(p),
    roles = (p.fontRoles || []).filter(
      (r) => !r.themeId || r.themeId === activeTheme(p)?.id,
    ),
    available = themeLayers(p).filter(
      (l) =>
        ["text", "time", "date", "metric", "chart"].includes(l.kind) &&
        !l.widgetOrigin &&
        !l.locked &&
        !p.fontRoles?.some((r) => r.layerIds.includes(l.id)),
    );
  const apply = (f: () => Project) => {
    try {
      onChange(f());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <details>
      <summary>主题角色与关联</summary>
      <p>
        颜色用途明确区分装饰与阈值状态色。字体角色统一一组控件；单独更换字体会解除该控件的关联，位置和字号继续独立。更改后重新生成工程。字体编辑通过撤销恢复，主题重置用于颜色、数据和开关配置。
      </p>
      <fieldset disabled={p.multiDevice?.scope === "device"}>
        {themeControls(p)
          .filter((c) => c.type === "color")
          .map((c) => (
            <details key={c.id}>
              <summary>
                {c.label} ·{" "}
                {colorRoleKinds.find((r) => r.id === c.semantic)?.name ||
                  "固定颜色"}
              </summary>
              <label>
                颜色用途
                <select
                  aria-label={c.label + "颜色用途"}
                  value={c.semantic || "fixed"}
                  onChange={(e) =>
                    apply(() =>
                      setColorRoleSemantic(
                        p,
                        c.id,
                        e.target.value === "fixed" ? undefined : e.target.value,
                      ),
                    )
                  }
                >
                  <option value="fixed">固定颜色</option>
                  {colorRoleKinds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              {c.targets.map((t) => (
                <p key={t.layerId + t.property}>
                  {p.layers.find((l) => l.id === t.layerId)?.name} ·{" "}
                  {t.property === "color" ? "颜色" : "阈值状态色"}{" "}
                  <button
                    type="button"
                    aria-label={
                      "解除颜色关联 " +
                      c.id +
                      " " +
                      t.layerId +
                      " " +
                      t.property
                    }
                    onClick={() => apply(() => detachColorTarget(p, c.id, t))}
                  >
                    解除关联
                  </button>
                </p>
              ))}
              {c.targets.some((t) => {
                const l = p.layers.find((l) => l.id === t.layerId);
                return (
                  l?.kind === "image" && !l.iconMask && !l.libraryIcon?.recolor
                );
              }) && (
                <p>
                  关联图片保留原像素颜色；请转换为可换色图标或使用主题图片变体。
                </p>
              )}
            </details>
          ))}
        {roles.map((r) => (
          <section key={r.id}>
            <label>
              {r.name}
              <select
                aria-label={"字体角色 " + r.name}
                value={r.fontId}
                onChange={(e) =>
                  apply(() => setFontRole(p, r.id, e.target.value))
                }
              >
                {options.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            {r.layerIds.map((id) => (
              <p key={id}>
                {p.layers.find((l) => l.id === id)?.name}
                <button
                  type="button"
                  aria-label={"解除字体关联 " + id}
                  onClick={() => apply(() => detachFontRole(p, r.id, id))}
                >
                  解除关联
                </button>
              </p>
            ))}
            <button
              type="button"
              onClick={() => apply(() => detachFontRole(p, r.id))}
            >
              解除整个字体角色
            </button>
          </section>
        ))}
        <details>
          <summary>建立字体角色</summary>
          <label>
            角色名称
            <input
              aria-label="字体角色名称"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            统一字体
            <select
              aria-label="新字体角色字体"
              value={options.some((f) => f.id === font) ? font : options[0].id}
              onChange={(e) => setFont(e.target.value)}
            >
              {options.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          {available.map((l) => (
            <label className="inline" key={l.id}>
              <input
                type="checkbox"
                aria-label={"绑定字体角色 " + l.name}
                checked={members.includes(l.id)}
                onChange={(e) =>
                  setMembers((m) =>
                    e.target.checked
                      ? [...m, l.id]
                      : m.filter((id) => id !== l.id),
                  )
                }
              />
              {l.name}
            </label>
          ))}
          <button
            type="button"
            disabled={!name.trim() || !members.length}
            onClick={() =>
              apply(() => {
                const n = createFontRole(
                  p,
                  "font-role-" + uid(),
                  name.trim(),
                  font,
                  members.filter((id) => available.some((l) => l.id === id)),
                );
                setMembers([]);
                return n;
              })
            }
          >
            建立字体关联
          </button>
        </details>
      </fieldset>
      {p.multiDevice?.scope === "device" && (
        <p>请在共享主设计编辑角色；当前设备仍可独立微调字体。</p>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
