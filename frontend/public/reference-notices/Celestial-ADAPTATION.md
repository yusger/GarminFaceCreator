# Celestial Creator adaptation

Source: https://github.com/Cutwell/garmin-celestial-watchface
Pinned revision: `c5d124c54866f23dbee7528a488c3802d120b715`.
Thank you to **Zachary Smith (Cutwell)** and contributors. Original MIT LICENSE (2024 Zachary Smith), README and original View text are retained verbatim. The original View is provenance in notices, not compiled input. Creator native templates retain GPL-3.0-or-later scope; this complete adaptation is not MIT-only output.

## Scope

- Initially **Venu 4 45mm**, with ten editable layers: background, dynamic sky, moving sun/night indicator, three landscape shapes, local date/time, title and actual battery.
- Original Forerunner 45 pixel layout is adapted to AMOLED and normalized Creator geometry. System fonts and code primitives replace original bitmaps/fonts; no original artwork binaries copied. This is not a flattened screenshot.
- Original sunrise equation is replaced by guarded Garmin Weather.getSunrise/getSunset with passive Position.getInfo cache. Adjacent-date event lists are matched around UTC now because the Garmin API may return date-shifted sunrise/sunset pairs. No active GPS, external account, network or shared key is introduced; Positioning permission is required.
- A missing cached location or unavailable/polar event window shows N/A and hides the sun/night marker. Obtain a position through a Garmin-supported activity/app when necessary; this Creator watchface does not start positioning. The simulator often has no cached position; do not substitute web preview samples into device code.
- Sun follows an illustrative daytime arc, not exact altitude/azimuth. The moon-shaped marker is fixed centrally at night, not a moon-phase or true lunar-position calculation. Different from SkyRing's outer-ring composition, this reference demonstrates editable sky/body/landscape layers and event-based visibility.
- Browser sunrise/sunset controls are explicitly labelled preview samples (initial 06:00/18:00), not location predictions. Source export retains the actual Garmin API program, never the preview sample times.
- AOD excludes all scene/landscape/data layers and keeps gray local time on black. No seconds animation. No claim of inherited upstream power figures, real-device efficiency or burn-in certification.

## Rebuild

Set `GFC_CELESTIAL_SOURCE` to the pinned source texts, run `node scripts/build-celestial-reference.mjs`, then `npm run build`. Three upstream input hashes are checked. No upstream scripts run. Full source exports include the generated Monkey C, editable design, complete original MIT notices and applicable Creator template source context.
