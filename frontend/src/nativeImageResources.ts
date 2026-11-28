import { generationDevice } from "./devices.ts";
import { imageAssetPath } from "./assets.ts";
import type { Project } from "./domain.ts";
// Input is the already expanded engineering scene. These are target resource sizes, not source PNG dimensions.
export function nativeImageBindings(p: Project) {
  const device=generationDevice(p);
  return p.layers.filter(l=>l.image&&l.exportIncluded!==false&&!l.iconMask&&!l.libraryIcon&&!l.weatherIcon).map(l=>{
    const width=Math.max(1,Math.round(l.w*device.screenWidth/454));
    const height=Math.max(1,Math.round(l.h*device.screenHeight/454));
    return {layerId:l.id,path:imageAssetPath(l),widthPx:width,heightPx:height,
      resourceScale:{scaleX:(width/device.screenWidth*100).toFixed(8)+"%",scaleY:(height/device.screenHeight*100).toFixed(8)+"%",scaleRelativeTo:"screen"},
      ...(l.imageFullColor?{packingFormat:"png",automaticPalette:false,dithering:"none"}:{}),
      drawing:"When using these compiler scaling attributes, drawBitmap at the scaled layer x/y; do not apply the size transform twice. A source shared at different sizes needs distinct bitmap declarations or an explicit runtime transform."};
  });
}
