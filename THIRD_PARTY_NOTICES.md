# 第三方内容说明

本仓库中的参考表盘和资源用于展示编辑、预览与编译流程，不意味着这些内容全部由 GarminFaceCreator 原创。

- **SkyRing**：源自 [daveshap/SkyRingGarmin](https://github.com/daveshap/SkyRingGarmin)，参考包包含适配后的源码及图标资源。上游说明保留于 `third-party/SkyRing/README.md`；当前保留的上游 README 及本次仓库核查未找到明确许可证；许可状态未核实，不将“公开源码”视为已授权再分发。
- **fine-o-clock / Fine'o clock**：源自 [causeri3/fine-o-clock](https://github.com/causeri3/fine-o-clock)，上游 README 声明 GPLv3+，但原始 `LICENCE` 文本为 LGPLv3；两者存在差异，本仓库原样保留 `third-party/fine-o-clock/LICENCE` 及 README，不擅自统一改写。本仓库保留适配后的源码、动画资源和字体。上游说明保留于 `third-party/fine-o-clock/README.md`，表盘展示与来源见其说明中的 Connect IQ 链接。
- **ClownWatch**：参考项目包含守门人风格布局；使用 Wildward 的参考部分按其 MIT 许可保留声明，见 `third-party/ClownWatch/Wildward-LICENSE.txt`。相关角色、插画和品牌不因代码许可证而获得额外授权。
- **Garmin Connect IQ SDK、设备包和字体**：由部署者自行安装，本仓库不分发完整 SDK；按 Garmin 对应条款使用。

应用依赖的许可见各依赖包的声明。参考图片、字体或其他第三方资源若有独立许可，以其原许可为准。

感谢 [daveshap](https://github.com/daveshap) 和 [causeri3](https://github.com/causeri3) 开源分享 SkyRing 与 fine-o-clock 的源码和设计，为本项目的参考表盘集成提供基础。

## Curated watch-face icon sources

The static icon catalog is separate from lucide-react UI icons. Original SVGs and full notices are retained under `frontend/public/icon-library/`; every catalog entry records its source, immutable commit or release, original path, SHA-256 and license.

- Lucide Icons and Contributors: https://github.com/lucide-icons/lucide, commit `586bf5cf9bcf4129a63c0ce574602b23ca24f324`. Ten selected originals; full ISC license including the Feather-derived MIT notices is retained in `icon-library/licenses/Lucide-LICENSE.txt`. These notices are not replaced by this repository's GPL license.
- Bas Milius / Meteocons: https://github.com/basmilius/meteocons. Seventeen selected static originals from official `@meteocons/svg-static@0.1.0`, package gitHead `1d821149b94a08f23c85e5042e8a61a3fcd82cf7`; full MIT copyright and license retained in `icon-library/licenses/Meteocons-LICENSE.txt`. The pinned registry tarball is checked against its SHA-512 integrity before reading selected files. No upstream install or build scripts are executed.

Static insertion and per-project export retain originals and full notices for actually used icons, along with raster derivative/style metadata. Weather-data binding remains a separate implementation milestone. It does not claim all Meteocons animations can be exported natively.

## Crystal Creator adaptation

[warmsound/crystal-face](https://github.com/warmsound/crystal-face), pinned `bcc340484bd2a3a09f13b22a2d0d6dae3b4de9c7`, is adapted under its original GPLv3 license. Thank you to warmsound and contributors. Retained unchanged: upstream LICENSE.txt, README and referenced 454×454 layout XML under `frontend/public/reference-notices/Crystal-*`. See [modification and scope notes](frontend/public/reference-notices/Crystal-ADAPTATION.md).

The Creator version contains editable layers and a complete new native build, initially for Venu 4 45mm. It uses system fonts and already curated Lucide icons; no upstream Titillium/Noto/glyph atlas or Noun Project assets are redistributed. The two goals are fixed design values, and external weather/background/GPS, original mobile settings, move bar and automatic segment sizing are omitted. Referenced layout/adaptation material is GPL-3.0-only; generator source templates and Lucide retain their separate notices. Source export includes the complete actual native program, design and full relevant licenses, rather than an upstream binary or a preview screenshot.

## TimelyFenix Creator adaptation

Thanks to [KWottrich/TimelyFenix](https://github.com/KWottrich/TimelyFenix), pinned `d38a347a548667780a9f17b84f5f02155687a72c`, and contributors. Original GPLv3 LICENSE and README, including the upstream PebbleTimely inspiration credit, are retained under `frontend/public/reference-notices/TimelyFenix-*`. This trimmed editable Venu 4 45mm adaptation uses system fonts and already curated Meteocons MIT weather icons; original Pixeden font/icon binaries are not copied. See [scope and modifications](frontend/public/reference-notices/TimelyFenix-ADAPTATION.md); original buffering and power claims do not apply automatically.

## About Time word-time locale phrases

The reusable word-time component includes English and Simplified Chinese phrase tables from [samuelmr/garmin-abouttime](https://github.com/samuelmr/garmin-abouttime), pinned `4fdf09bcf784ecf385b9dce546af3f277e13caa5`, copyright (c) 2019 Samuel Rinnetmäki, MIT. Complete license and original locale XML are retained under `frontend/public/reference-notices/AboutTime-*` and attached to source exports containing the adapter, even outside a reference project. The Creator adapter retains GPL-3.0-or-later scope. No upstream font/icon binary is copied. A future default reference is a separate integration stage.

## AboutTime default reference

The default AboutTime Creator layout adapts the pinned About Time version above. It includes three editable word-time rows and actual local date/battery, initially for Venu 4 45mm. Original MIT source phrases and complete copyright/notice remain MIT; Creator native templates retain GPLv3+ scope. The original README and two locale XML files accompany export. No original font/icon binary or other language package is copied. See [scope and modifications](frontend/public/reference-notices/AboutTime-ADAPTATION.md).


## KISSFace Creator adaptation

Thanks to [Delfim Machado / dbcm/KISSFace](https://github.com/dbcm/KISSFace), pinned `35617422cfc6e8db0c703b247c54835c3d77008c`, copyright (c) 2017 Delfim Machado, MIT. Original LICENSE and README are retained in `frontend/public/reference-notices/KISSFace-*`. This trimmed editable adaptation replaces liquid digit fill and the battery arc with independent-color digits and dynamic segmented meters. Creator native templates retain GPLv3+ scope; system fonts and curated Lucide icons replace original binaries. See [scope and differences](frontend/public/reference-notices/KISSFace-ADAPTATION.md).


## Yet Another Creator adaptation

Thanks to [Laverlin / Yet-Another-WatchFace](https://github.com/Laverlin/Yet-Another-WatchFace), pinned `f9db8c2d3a1f10633c195e5516d96d45f0f61340`, copyright (c) 2018 Laverlin, MIT. Original LICENSE, README and 454 layout XML are retained under `frontend/public/reference-notices/YetAnother-*`. This trimmed adaptation includes split time, activity data and a fixed-UTC-offset secondary clock; original automatic DST, GPS/currency/external weather and lunar infrastructure are not copied. Creator native templates retain GPLv3+ scope. See [scope and differences](frontend/public/reference-notices/YetAnother-ADAPTATION.md).


## Celestial Creator adaptation

Thanks to [Zachary Smith / Cutwell](https://github.com/Cutwell/garmin-celestial-watchface), pinned `c5d124c54866f23dbee7528a488c3802d120b715`, copyright (c) 2024 Zachary Smith, MIT. Original LICENSE, README and original View text are retained under `frontend/public/reference-notices/Celestial-*`; the View is provenance only, not compiled source. The Creator adaptation uses Garmin sun APIs, passive cached location, system fonts and primitive graphics; original algorithm/font/bitmap binaries are not copied into the native program. Creator templates retain GPLv3+ scope. See [scope and differences](frontend/public/reference-notices/Celestial-ADAPTATION.md).
