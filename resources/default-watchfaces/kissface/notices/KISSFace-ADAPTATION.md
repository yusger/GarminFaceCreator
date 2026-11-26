# KISSFace Creator adaptation

Source: https://github.com/dbcm/KISSFace
Pinned revision: `35617422cfc6e8db0c703b247c54835c3d77008c`.
Thank you to **Delfim Machado** and contributors. Original MIT LICENSE and README are retained verbatim. Creator native generator templates retain GPL-3.0-or-later scope; the complete adaptation is not MIT-only output.

Initially for **Venu 4 45mm**, with editable time digits, date, cached heart rate, battery, steps and two dynamic segmented meters. Each digit is a zero-padded part of device local time with an independent color. Only gray digits and their separator remain in Always-On mode; no seconds timer is installed.

## Explicit changes from upstream

- Original liquid/wave fill inside digits and outer battery arc are replaced by fixed-color digits and **dynamic segmented goal bars**. The bars read actual device steps/battery; they are not decorative static artwork. Steps use an editable fixed 10,000-step target, not Garmin's automatic goal. Battery uses 100 percent.
- Digit colors are editable decoration, not a claim that four original activity goals are being measured. Floors, intensity minutes, calorie-goal estimation, rotating status/move bars, DND and phone/alarm indicators are omitted.
- Heart rate reads the latest guarded Garmin SensorHistory cached entry, without starting a sensor; unavailable samples display `--`. It may be older than the current time. Creator thresholds are <120 green, [120,150) yellow, >=150 red, differing from original thresholds. Battery is <10 red, [10,30) yellow, >=30 pale cyan. Heart icon has its own fixed tint; numeric heart rate changes by thresholds.
- Uses system fonts and already curated Lucide ISC/Feather MIT icons, with applicable full notices exported. Original custom font, icons and source implementation are not copied. Original README is retained for provenance, not a promise that every upstream feature is present.
- Browser geometry and native discrete fonts can differ. Verify native output after edits; simulator checks do not certify real-device AOD/power/burn-in behavior.

## Rebuild

Set `GFC_KISS_SOURCE` to the selected pinned source text and run `node scripts/build-kiss-reference.mjs`, then `npm run build`. Two original input SHA-256 values are checked; no upstream scripts run. Source export contains the actual complete native files, editable design, original notices and applicable generator source context.
