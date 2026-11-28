# 精确主题项目包：theme-project-v2

离线检查与转换已实现，自动发布 API 仍未上线。此版本独立于 theme-project-v1 和 deterministic-v2；不能通过替换 profile 声明兼容旧版。

交付结构沿用 [主题包 v1](theme-project-package-v1.md)：publish.json、design.json、cases.json、资源、完整许可和每个主题/目标的亮屏与 AOD PNG。主体固定 Schema50；manifest 为 format=gfc-theme-project、formatVersion=2、profile=theme-project-v2；cases 继续使用已冻结的 gfc-theme-project-cases / formatVersion=1 语义结构。

新增边界：

- 项目最多32份位图字体，所有图集合计4MiB；普通目标仍最多8份。多主题目标合计最多16份，每个主题的亮屏与AOD分别至多8份，条件分支取可能使用字体并集。原始TTF/OTF仍最多8份和原有字节限制。manifest.fonts 最多40项。
- 字体角色最多32项；支持固定字形、字距、等宽数字、基线、自动行高0及显式设备覆盖/null清除。星期+日和月日星期格式均明确支持。
- componentStyles 最多24定义，每定义40个显式插槽；主样式/绑定/版本/实例覆盖保留。只接受几何、配色、AOD等外观白名单，禁止借样式注入字体、来源、素材、代码或结构。绑定关系、尺寸、版本和部件类型继续通过运行时校验。
- AOD颜色用例核验实际AOD颜色，不接受拿亮屏阈值颜色代替。每主题/目标仍必须提供亮屏与AOD的正常、零、缺失用例；所有数据源选项与原始阈值边界必须覆盖。

仍不接受图表、月相、任意SVG、脚本、工程源码或schema未列出的字段。三份主体/清单schema分别为 theme-project-v2.schema.json、theme-project-manifest-v2.schema.json 和沿用的 theme-project-cases-v1.schema.json。批准字体六份身份及SHA独立固定在 resources/capabilities/theme-project-v2-baseline.json。

安全边界维持100个文件、单文件8MiB、包25MiB、目录8层/200项；所有资源按清单逐字节核对、拒绝符号链接/路径穿越/未声明文件。相同图片字节可以由多个明确layerId共享同一文件，并保留各自notice绑定。内容哈希不等于作者签名。

运行：node scripts/theme-project-package.mjs <解包目录>。转换返回可编辑项目和各目标源码草稿；完整字体资源准备、SDK编译、原生/实际Sleep/真机验收分别执行，离线通过不等于设备通过。

完整精确样包在 resources/examples/theme-project-v2：使用自主trail的三主题、双尺寸、28份FNT+PNG、2份原始TTF、27个字体角色；66个图像绑定按字节去重为12个图片文件，合计89文件、102语义用例、12张实际浏览器预览。该目录是交付示例，不增加默认库数量。设计署名与原始完整OFL均保留。

维护者可使用 scripts/build-precision-theme-example.mjs，在显式指定的测试网页上重建预览和清单；不调用模型/编译/worker/发布API，不自动清理额外文件。旧v1样包、schema和预算保持冻结。
