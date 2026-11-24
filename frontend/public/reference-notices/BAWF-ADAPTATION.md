# BAWF Creator adaptation

Source: https://github.com/kevinboone/BAWF
Pinned revision: `243293ba4d2a4f03c4ed767bb072a7838386c741`.
Thank you to **Kevin Boone**. Both original source files explicitly state copyright (c)2018-2023 Kevin Boone and GNU Public Licence v3.0; this is the license basis, not an inference from public availability. The original source texts and README are retained verbatim, with a complete GPLv3 copy supplied. The original header is also preserved in generated App.mc. The layout adaptation retains GPL-3.0-only scope; Creator generator templates retain GPL-3.0-or-later scope, which can be used under GPLv3. Do not label the adaptation as MIT-only or claim all unrelated tool output inherits one license.

## Included and changed

- Initially **Venu 4 45mm**. Eighteen editable layers: background, twelve numerals, date, actual rounded battery, independent hour/minute hands and center arbor. Uses system fonts and drawing primitives, without upstream icon/font binaries or a flattened screenshot.
- Hour/minute movement uses Creator's guarded time binding and editable normalized pivots/lengths/widths. Solid line hands replace upstream outlined polygon hands. There is no seconds hand in this reference; Creator's optional second-hand component is separate.
- Fixed Jungle builds a single selected design. The default is white-on-black. To create black-on-white, copy the reference, change background to white and foreground numerals/date/battery/hands/arbor to black, regenerate and compile. No upstream bow/wob annotations, alternate Jungle or signing scripts are run. Keep AOD colors independent: black background and gray hands/cardinal numbers remain in either bright-screen theme.
- AOD keeps four cardinal numerals, two gray hands and the arbor; date/battery/other numerals are omitted. No seconds timer is installed. This is not the original buffering/rounding/math optimization implementation; the original battery-saving name and README are provenance, not measured performance claims for this adaptation.
- The original DND icon and offscreen-buffer compatibility code are not copied. This adaptation does not promise the original device matrix, power consumption, burn-in behavior or exact typography. Hands can cross small date/battery fields as on a conventional analog dial; layers remain editable if placement needs adjustment.

## Rebuild and source export

Set `GFC_BAWF_SOURCE` to the pinned source texts, run `node scripts/build-bawf-reference.mjs`, then `npm run build`. Three fixed input SHA-256 values and explicit source license headers are checked. No upstream code/scripts/binaries are executed. Source export contains complete actual Monkey C/resources, editable design, original copyright/source texts, full applicable GPL notices and matching generator source context.
