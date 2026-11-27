# Apex Instrument — GFC design package

- Package id: `apex-instrument`
- Version: `1.0.0`
- Canvas: 454×454, circle, safeInset 12
- Target: Venu 4 45mm (454×454)
- Data sources: battery, calories, distance, heartRate, steps
- Time format: `HH:mm` + `ss`; date format: `ddd DD` (en). The source HTML showed `THU 26 NOV`, but formatVersion 1 only accepts `ddd DD` / `MM.DD ddd`, so the month token was removed rather than faked dynamically.
- AOD: time, key data and battery are rendered by explicit AOD-only layers; decorations and seconds are hidden.
- Preview: `preview.png` (active) and `preview-aod.png` (AOD), both rendered from `watchface.json` by the package-local renderer.
- State: design-only. No SDK build, no simulator run, no hardware verification.

Converted from `watchface-454-native.html` Rev.04. The layout keeps the original quadrant rhythm and the 24-segment outer ring, while replacing unsupported static date text with the contract date layer and replacing HTML CSS effects with GFC layer types.
