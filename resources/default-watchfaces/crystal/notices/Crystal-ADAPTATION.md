# Crystal Creator adaptation

Source: https://github.com/warmsound/crystal-face
Pinned revision: `bcc340484bd2a3a09f13b22a2d0d6dae3b4de9c7` (master).
Thank you to **warmsound** and upstream contributors for sharing Crystal.

This is a trimmed, editable GarminFaceCreator adaptation for **Venu 4 45mm**, not an unmodified upstream release. Layout references are the upstream 454×454 resource: large independent HH/MM, date, data rows and two curved goal meters. The original GPLv3 license, README and referenced layout XML are retained unchanged. Adaptation/layout material is distributed under GPL-3.0-only; the generator source context retains its GPL-3.0-or-later notice and selected Lucide assets retain their complete ISC/Feather MIT notices. The source export contains the actual complete native build input and editable design.

## Included

- Independent editable hours, colon, minutes, date, live seconds, battery, daily distance in km, steps and total daily calories.
- Two composite goal meters: daily steps / fixed goal 10,000 and battery / fixed goal 100; 20 editable segments each, bottom-first lighting, configurable dim portions.
- All text, geometry, data bindings, colors and licensed icon layers can be edited in an independent copy. No whole-face preview bitmap.
- Explicit AOD inclusion/color: only time parts remain by default, without seconds animation. This is not a certification of burn-in safety or measured power.

## Deliberate differences / omitted features

- Garmin system fonts replace upstream Titillium/Noto/bitmap font packages. Browser weight differences are approximate; native hours and minutes currently use the same supported system number font. No SDK or upstream font binaries are redistributed.
- Three Lucide icons replace upstream Noun Project / custom glyph atlases; none of those original icon/font assets are copied. Complete Lucide ISC and Feather MIT notices accompany source export.
- No upstream annotation/source override system is required: the package contains complete deterministic Monkey C and resources for the fixed backend Jungle. The original layout XML under notices is attribution context, not an extra runtime resource.
- No upstream automatic goal segmentation, move-bar, configurable status indicators, all-theme settings, external OpenWeatherMap/background/GPS service, account or shared API key. Colors and goals are edited through Creator controls; the original mobile settings schema is not carried over.
- The reference native bundle initially targets Venu 4 45mm only. Editing another target requires generating and checking a new native program; changing device metadata alone does not adapt the original native bundle.

## Rebuild

Extract the pinned GitHub archive, set `GFC_CRYSTAL_SOURCE` to that extracted directory, then run `node scripts/build-crystal-reference.mjs`. The script checks SHA-256 for the three upstream files it reads, executes no upstream code, and rasterizes only the already curated Lucide SVGs using Playwright. Run `npm run build` to refresh the source/provenance fingerprints. The native files in the template are the complete compile input; the browser uses the editable layer representation.
