# TimelyFenix Creator adaptation

Upstream: https://github.com/KWottrich/TimelyFenix
Pinned revision: `d38a347a548667780a9f17b84f5f02155687a72c` (main).
Thank you to **KWottrich** and contributors. The upstream README credits PebbleTimely for inspiration; that credit is retained unchanged.

This is a trimmed editable layout adaptation for **Venu 4 45mm**, distributed under the original GPLv3 license (GPL-3.0-only for adaptation/layout material). It is not an unmodified upstream release. Complete original LICENSE and README are retained. Native code uses this repository's deterministic generator templates, whose source context retains GPL-3.0-or-later notices. Selected Bas Milius Meteocons icons retain their original MIT notices.

## Included and editable

- Separate background, title, live time, local weekday/day date, battery metric, separator, three-week calendar and cached-weather layers.
- Calendar shows previous/current/next weeks, Monday/Sunday start, today's highlight, adjacent-month dimming and independent theme controls. Its native day data is cached until the local date changes; webpage preview has a date selector and current browser date mode.
- Weather uses the fixed cached Garmin Weather helper and curated Monochrome Meteocons day icons with all nine categories, including a missing-data fallback. It can be switched to night style through Creator. No external account/key or extra network service.
- Default AOD includes only time against black. It has no seconds animation. This does not certify power consumption or burn-in safety.

## Differences

- Original 240–280 pixel layout is rebuilt as editable normalized layers for 454×454; complete generated Monkey C/resources work with the backend's fixed Jungle.
- Garmin system fonts and already reviewed Meteocons replace original font/icon resources. No upstream Pixeden font/icon binaries are copied.
- The original month's full textual footer, temperature/detail panels, status toggles, per-change framebuffer optimization and original phone settings are not ported. Do not infer the upstream project's battery-efficiency measurements apply to this adaptation. The calendar cache stores date cells, not the original offscreen render buffer.
- Colors, data binding and calendar settings are edited in Creator. The native reference initially targets Venu 4 45mm; other targets require regenerating and checking code.

## Rebuild

Extract the pinned GitHub archive, set `GFC_TIMELY_SOURCE` to it, run `node scripts/build-timely-reference.mjs`, then `npm run build`. Input LICENSE and README SHA-256 are checked, as are curated SVG fingerprints. The script runs no upstream code; Playwright rasterizes the already curated static icons. Export retains the actual complete native build input, editable design, original notices and only the weather originals actually used.
