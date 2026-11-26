# 胶囊数据行 (`capsule-metric`)

作者：yusger · 许可：MIT · 版本：1.0.0

## 参考来源

参考图：19_7cc48f2b_Last run 胶囊；12_4d03a1d3_Ocean 数据行（位于 `C:\Work\Garmin\表盘参考图`）。仅提炼结构手法，未使用原图素材。

## 结构

- 画布：240×80 局部坐标，`uniform-fit`
- 图层：5 层（数组顺序即绘制顺序）
- 参数：2 项 — `accent`(color)、`show-label`(boolean)
- 验收用例：7 条

## 预览数据

preview.png / preview-aod.png 使用 `cases.json` 中 `normal` 用例的同一组数据渲染；
AOD 图只绘制 `aod:true` 的图层并使用 `aodColor`。

## 接入注意

- 所有坐标相对控件局部画布，插入表盘后由程序等比缩放。
- 缺失数据显示 `--`，且与有效 0 的 `fillFraction` 语义不同（缺失为 null）。
- 颜色/显隐由用户在编辑器配置，本包只给默认值。
- 本控件未包含运行脚本、网络请求或外部字体。
