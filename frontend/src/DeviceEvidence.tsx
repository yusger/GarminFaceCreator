import type { Project } from "./domain";
import { deviceMetadata, deviceMetadataVersion } from "./deviceMetadata";
import { resourceBytes } from "./resourceInventory";
export default function DeviceEvidence({ project: p }: { project: Project }) {
  const d = deviceMetadata(p.target || "venu445mm");
  return (
    <details data-device-evidence>
      <summary>
        目标设备依据 · {d?.status === "sdk-package" ? "SDK设备包" : "未知"}
      </summary>
      {d?.status === "sdk-package" ? (
        <>
          <p>
            {d.width}×{d.height} · {d.shape} · {d.displayType} ·{" "}
            {d.bitsPerPixel}位 · 透明混合{d.alphaBlending ? "支持" : "未声明"}
          </p>
          <p>包内API版本：{d.apiVersions?.join(" / ") || "未知"}</p>
          <p>
            表盘应用内存限制：
            {resourceBytes(d.watchFaceMemoryBytes ?? undefined)}；图形资源池：
            {resourceBytes(d.graphicsPoolBytes ?? undefined)}
          </p>
          <p>传感器历史声明：{d.sensorHistory?.join(" / ") || "未知"}</p>
          <p className="hint">
            内存限制与图形池是不同预算，原图RGBA估算不能直接等同任一运行开销。传感器历史声明不代表所有数据接口或当前有读数。实际固件、AOD切换和真机功耗未验证。
          </p>
          <small>
            目录 {deviceMetadataVersion} · 设备包 {d.source?.packageVersion}
          </small>
        </>
      ) : (
        <p>未取得设备包证据，保留为待验证。</p>
      )}
    </details>
  );
}
