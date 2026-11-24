import { useEffect, useState } from "react";
import { findIcon, type LibraryIcon } from "./iconLibrary";
export default function IconDetails({ id }: { id: string }) {
  const [icon, setIcon] = useState<LibraryIcon | null>(null);
  useEffect(() => {
    findIcon(id)
      .then(setIcon)
      .catch(() => setIcon(null));
  }, [id]);
  return icon ? (
    <details className="hint">
      <summary>素材来源与许可</summary>
      <p>
        {icon.name} · {icon.license}
      </p>
      <p>{icon.copyright}</p>
      <a href={icon.source} target="_blank" rel="noreferrer">
        原始来源
      </a>
      {" · "}
      <a href={icon.licensePath} target="_blank" rel="noreferrer">
        完整许可证
      </a>
      <p>固定版本：{icon.package || icon.commit.slice(0, 12)}</p>
    </details>
  ) : (
    <p className="hint">
      素材来源暂不可用，保留 PNG 预览；编译时需恢复目录连接。
    </p>
  );
}
