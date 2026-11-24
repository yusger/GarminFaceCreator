import { weatherGroup, weatherIconId } from "./weatherIcons";
import { useEffect, useState } from "react";
import type { Layer } from "./domain";
import { styledIcon, svgDataUrl } from "./iconLibrary";
export function useLibraryHref(
  l: Layer,
  condition?: number | null,
  missing = false,
) {
  const [href, setHref] = useState(l.image);
  useEffect(() => {
    let live = true;
    setHref(l.image);
    if (l.libraryIcon)
      styledIcon(
        l.weatherIcon
          ? {
              ...l,
              libraryIcon: {
                ...l.libraryIcon!,
                id: weatherIconId(
                  l,
                  weatherGroup(
                    missing ? null : condition === undefined ? 0 : condition,
                  ).key,
                ),
              },
            }
          : l,
      )
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
    l.weatherIcon?.period,
    condition,
    missing,
  ]);
  return l.libraryIcon ? href : l.image;
}
export default function LibraryImage({
  layer,
  condition,
  missing,
}: {
  layer: Layer;
  condition?: number | null;
  missing?: boolean;
}) {
  const href = useLibraryHref(layer, condition, missing);
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
