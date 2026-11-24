import { useEffect, useState } from "react";
import type { Layer } from "./domain";
import { styledIcon, svgDataUrl } from "./iconLibrary";
export function useLibraryHref(l: Layer) {
  const [href, setHref] = useState(l.image);
  useEffect(() => {
    let live = true;
    setHref(l.image);
    if (l.libraryIcon)
      styledIcon(l)
        .then((svg) => {
          if (live) setHref(svgDataUrl(svg));
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [
    l.image,
    l.libraryIcon?.id,
    l.libraryIcon?.recolor,
    l.libraryIcon?.strokeWidth,
    l.color,
  ]);
  return l.libraryIcon ? href : l.image;
}
export default function LibraryImage({ layer }: { layer: Layer }) {
  const href = useLibraryHref(layer);
  return (
    <image
      href={href}
      width={layer.w}
      height={layer.h}
      preserveAspectRatio={
        layer.libraryIcon ? "xMidYMid meet" : "xMidYMid slice"
      }
    />
  );
}
