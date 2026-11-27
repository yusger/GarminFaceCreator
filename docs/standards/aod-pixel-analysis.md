# 合成后AOD像素分析

`aod-pixels-1`分析实际目标尺寸的RGBA合成图；网页记录为browser-estimate，受保护原生截图记录为native-frame。截图容器版本browser-capture-3保留目标、预览参数、修订和分析；原生统计导出附buildId/projectId/revision/PRG与源码SHA，不替代服务端原始元数据。

算法：透明像素在黑底合成并取整到字节；max(R,G,B)>0计为非黑，max>=16另作抗锯齿敏感性下界，暗色仍属于点亮。圆屏用像素中心落在min(width,height)/2圆内的实际像素数为分母，同时记录完整矩形分母及比率；矩形或未知形状分别说明。不是累加图层包围盒，也不按肉眼是否清晰排除暗色。

首批仅显式登记Venu4两尺寸AMOLED的10%文档参考线。设备/尺寸/显示类型以已记录SDK包事实匹配；其他目标保持未知，不统一套用阈值。比较结果为“超过/低于文档参考”，没有pass或功耗合格结论。SDK内部统计与圆周取整可能不同，保留矩形比率、原始图像和算法定义便于对照。

网页检查会暂停动态读数、冻结当次截图；之后修改预览或工程会隐藏旧统计并提示重查。下载的原记录继续对应其冻结参数。本地检查不调用模型、不上传素材、不创建原生任务。

原生图像只有applicationMode=aod时才用于AOD参考比较。active/unknown帧仍可计数，但明确不作AOD判定。读取仍走原任务令牌保护的截图入口，统计在浏览器本地完成。

单帧不能验证同一像素连续点亮、多状态极值、实际Sleep生命周期、热图或真机续航。低于10%也可能漏掉时间、数据或字形，因此不能自动通过设计验收。后续完整矩阵须涵盖三主题、日期/长读数/缺失/阈值和持续状态。

依据（2026-11-28）：[Garmin Watch Faces](https://developer.garmin.com/connect-iq/articles/user-experience-guidelines/Watch_Faces.html)、[Entry Points](https://developer.garmin.com/connect-iq/articles/user-experience-guidelines/Entry_Points.html)、[requiresBurnInProtection](https://developer.garmin.com/connect-iq/api-docs/Toybox/System/DeviceSettings.html)。目标事实来自已登记的SDK metadata；防烧屏版本和实际固件仍需设备核验。
