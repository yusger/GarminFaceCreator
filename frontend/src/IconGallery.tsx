import { useEffect, useState } from "react";
import {
  loadIconCatalog,
  styledIcon,
  svgDataUrl,
  type LibraryIcon,
} from "./iconLibrary";
function IconThumb({ icon }: { icon: LibraryIcon }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    styledIcon({
      color: "#c9e5e1",
      libraryIcon: { id: icon.id, recolor: false, strokeWidth: 2 },
    })
      .then((svg) => setSrc(svgDataUrl(svg)))
      .catch(() => {});
  }, [icon.id]);
  return <img src={src || undefined} alt="" />;
}
export default function IconGallery({
  onInsert,
}: {
  onInsert: (icon: LibraryIcon) => void;
}) {
  const [icons, setIcons] = useState<LibraryIcon[]>([]),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("lucide");
  useEffect(() => {
    loadIconCatalog()
      .then(setIcons)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="icon-gallery">
      <h4>内置静态图标</h4>
      <select
        aria-label="素材分类"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="lucide">通用图标</option>
        <option value="meteocons">天气图标</option>
      </select>
      <input
        aria-label="搜索素材"
        placeholder="名称或关键词"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <div className="icon-grid">
        {icons
          .filter(
            (i) =>
              i.provider === category &&
              [i.name, ...i.keywords]
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((icon) => (
            <button
              key={icon.id}
              title={icon.name + " · " + icon.license}
              aria-label={"插入素材 " + icon.name}
              onClick={() => onInsert(icon)}
            >
              <IconThumb icon={icon} />
              <span>{icon.name}</span>
            </button>
          ))}
      </div>
      <p className="hint">
        点击插入；天气图标当前为静态素材，尚未绑定天气。原图及授权信息随所用素材记录。
      </p>
    </section>
  );
}
