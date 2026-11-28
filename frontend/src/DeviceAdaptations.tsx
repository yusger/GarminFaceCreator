import { useState } from "react";
import type { Project } from "./domain";
import { devices, deviceLabel } from "./devices";
import {
  addDevice,
  deviceKey,
  enableDevices,
  resetDevice,
  selectDevice,
} from "./multiDevice";
export default function DeviceAdaptations({
  project: p,
  onChange,
  disabled,
}: {
  project: Project;
  onChange: (p: Project) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false),
    [choice, setChoice] = useState("venu441mm:41mm");
  const m = p.multiDevice;
  return (
    <section className="device-adaptations" aria-label="多设备适配">
      <button disabled={disabled} onClick={() => setOpen(!open)}>
        适配设备{m ? `（${m.variants.length}）` : ""}
      </button>
      {open && (
        <div className="adaptation-panel">
          <strong>共享主设计 · 多设备适配</strong>
          <p>
            圆形 AMOLED；图层坐标统一为 454 ×
            454，按目标像素缩放。微调只对所选设备生效。
          </p>
          {!m ? (
            <button
              disabled={disabled}
              onClick={() => onChange(enableDevices(p))}
            >
              启用多设备适配
            </button>
          ) : (
            <>
              <label>
                当前设备
                <select
                  aria-label="适配预览设备"
                  disabled={disabled}
                  value={deviceKey(p)}
                  onChange={(e) => onChange(selectDevice(p, e.target.value))}
                >
                  {m.variants.map((v) => (
                    <option key={v.key} value={v.key}>
                      {deviceLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                编辑范围
                <select
                  aria-label="适配编辑范围"
                  disabled={disabled}
                  value={m.scope}
                  onChange={(e) =>
                    onChange(
                      selectDevice(
                        p,
                        deviceKey(p),
                        e.target.value as "master" | "device",
                      ),
                    )
                  }
                >
                  <option value="master">共享主设计</option>
                  <option value="device">当前设备微调</option>
                </select>
              </label>
              <p>
                {m.scope === "master"
                  ? "正在编辑共享图层；改动会同步到各设备，设备已覆盖的属性继续保留。"
                  : "可调整位置、尺寸、字体、排版、颜色和显示开关。添加、删除、排序及数据绑定请回到共享主设计。"}
              </p>
              <label>
                添加设备
                <select
                  aria-label="添加适配设备"
                  disabled={disabled}
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                >
                  {devices.map((d) => (
                    <option
                      key={d.id + ":" + d.size}
                      value={d.id + ":" + d.size}
                    >
                      {deviceLabel({ target: d.id, deviceSize: d.size })} ·{" "}
                      {d.pixels} px
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={disabled}
                onClick={() => {
                  const d = devices.find((d) => d.id + ":" + d.size === choice);
                  if (d) onChange(addDevice(p, d));
                }}
              >
                添加并预览
              </button>
              <button
                disabled={disabled || m.scope !== "device"}
                onClick={() => {
                  if (confirm("清除当前设备的所有微调，恢复跟随共享主设计？"))
                    onChange(resetDevice(p));
                }}
              >
                重置当前设备微调
              </button>
              <ul>
                {m.variants.map((v) => (
                  <li key={v.key}>
                    {deviceLabel(v)} · {Object.keys(v.overrides).length} 层微调
                    ·{" "}
                    {v.code.files.length
                      ? v.code.codeRevision === v.revision
                        ? "代码可编译"
                        : "代码已过期"
                      : "未生成代码"}
                    {v.buildStatus ? ` · ${v.buildStatus}` : ""}
                  </li>
                ))}
              </ul>
              <small>通过编译与模拟器检查后再确认兼容；真机仍需验证。</small>
            </>
          )}
        </div>
      )}
    </section>
  );
}
