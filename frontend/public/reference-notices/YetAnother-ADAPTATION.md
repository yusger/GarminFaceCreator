# Yet Another Creator adaptation

Source: https://github.com/Laverlin/Yet-Another-WatchFace
Pinned revision: `f9db8c2d3a1f10633c195e5516d96d45f0f61340`.
Thank you to **Laverlin** and contributors. Original MIT LICENSE (2018 Laverlin), README and 454-pixel layout XML are retained verbatim. Creator native generator templates retain GPL-3.0-or-later scope; this complete adaptation is not MIT-only output.

## Included and changed

- Initially **Venu 4 45mm**. Thirteen editable layers adapt the two-column composition: separate stacked HH/MM, local date, divider, battery, daily steps, cached heart rate, daily distance in km, daily total calories, title, background and optional secondary time. Values read actual device sources; missing data uses placeholders.
- Secondary clock defaults to fixed UTC+00:00; its time inspector can choose another signed UTC offset or device local time. **Fixed offset does not automatically adjust destination DST**, unlike the original region timezone behavior. Device local mode still follows device settings. Change the separate editable timezone label together with its clock; changing that text alone never changes the underlying offset. No region database or automatic location inference is included.
- Original GPS city, currency exchange, external weather account/network service, lunar/zodiac and sunrise/sunset calculations, alarms/notifications, floors and original phone settings are omitted. The original README is retained as provenance, not a list of delivered Creator features. No external accounts, shared API keys, location or network permissions are added.
- System fonts replace original font/icon binaries, which are not copied. Original 454 layout XML is provenance only and is not loaded as executable resources. No upstream scripts run.
- AOD keeps only gray local HH/MM on black, without secondary time or seconds animation. Original energy/rendering claims are not inherited; real-device power, font coverage and burn-in behavior need hardware checks.

## Rebuild and export

Set `GFC_YAWF_SOURCE` to extracted pinned source text and run `node scripts/build-yawf-reference.mjs`, then `npm run build`. Three upstream input SHA-256 values are checked. Export contains the actual complete native program, editable design and full applicable notices/source context, not a flattened face screenshot. Native system fonts may differ from browser preview.
