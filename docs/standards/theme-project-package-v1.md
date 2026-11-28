# 外部主题项目包：theme-project-v1

状态：离线接入与转换已实现；自动发布 API 未上线。该契约独立于冻结的 `deterministic-v2`，不能更换旧包的 profile 后直接视为兼容。

## 交付结构

```text
package/
  publish.json
  design.json
  cases.json
  LICENSE.txt
  previews/             每个主题、每个目标的亮屏/AOD PNG
  resources/            可选图片、TTF/OTF、FNT及其灰度PNG、完整许可
```

三个封闭 schema：`resources/schemas/theme-project-manifest-v1.schema.json`、`theme-project-v1.schema.json`、`theme-project-cases-v1.schema.json`。可运行样包在 `resources/examples/theme-project-v1`；该样包是原创建模示例，不是新增默认表盘。

## 主体和适配

- `format: gfc-theme-project`、`formatVersion: 1`、`profile: theme-project-v1`；项目固定 Schema49，代码/版本历史为空，revision为0、codeRevision为-1。禁止携带工程源码、私有来源记录、快照和其他未声明字段。
- 支持单一项目2–8主题；每主题身份、版本、图层/配置归属和背景明确。支持颜色、装饰开关、数据槽及字体角色。颜色语义支持 primary/accent/track/text/warning/danger。字体角色是编辑阶段定义，手表端不提供任意字体切换菜单。
- 本版本目标仅 Venu4 45mm(454) / 41mm(390)。多设备使用同一master、scope=master，variants保留微调，所有设备源码历史为空。清单必须准确列出项目的所有目标，不得只交454图冒充390支持。
- 支持字段以封闭schema为准。此profile基于现有几何、复合控件和排版子集，**不收图表、月相等schema未列出的字段**；编辑器支持不等于本提交profile支持。需要扩展时另行版本化，不临时扩大旧profile。

## 资源和字体

- `files`声明除publish.json之外的每一文件：path、role、bytes、SHA-256。路径仅相对ASCII路径；无绝对路径、`..`、重复大小写路径、符号链接、未声明文件和特殊文件。最多100文件，单文件8MiB、整体25MiB，目录层级最多8、目录项最多200。SHA-256用于核对字节，**不是作者身份或数字签名**。
- 图片图层的`image`留空，由`images[]`指定layerId/file/noticeFile绑定PNG。不得内联base64、远程图片URL或嵌套脚本。PNG尺寸1–2048；预览必须与具体目标尺寸一致。
- 内置字体只接受本profile固定的6个身份/文件/族名及实际SHA，基线位于`resources/capabilities/theme-project-v1-baseline.json`，不随素材库新增而隐式扩展。
- 自定义TTF/OTF：`fonts[]`的kind为ttf/otf，携带id、family、file、noticeFile、source；id按现有导入器根据规范data URL推导，不能随意命名。转换后完整许可与原始字节进入项目localFonts，遵守4MiB/份、8份及16MiB总预算。
- 固定位图字体：kind=bitmap，file为单页FNT，atlas为灰度PNG，身份按现有`createBitmapFontAsset`产生；族名必须一致。遵守现有图集/字形/目标预算及严格缺字检查，不接受彩色图集、远程page或多页字体。完整许可保留在项目内。
- 所有资源必须有非空许可/授权文件。工具只能确认文件和引用完整，使用者仍需确认确有对应分发授权。

## 验收用例和预览

`cases.json`使用`gfc-theme-project-cases` v1。每条有唯一id、themeId、target、mode(active/aod)、scenario(normal/zero/missing/threshold/source)、固定data、controlValues、expect。expect包含完整visibleLayerIds和所有可见文字读数；阈值用例还必须列出`colors`。

每个主题×目标×模式必须覆盖normal/zero/missing；zero必须含真正零值，missing标记缺失。每个可切换来源至少有对应用例，非默认来源使用source场景；阈值包含每个有限区间边界，核对颜色。不能引用其他主题的配置项。每个模式至少保留实际time或hand控件，静态时间文字不能充当时钟。单组沿用固定数据语义校验器，最多60例；整包最多240例。

每个主题×目标×模式都必须提供PNG预览；校验工具核对矩阵、尺寸和资源字节，**不会把PNG存在视为视觉还原合格**。样包12张预览来自真实网页固定数据渲染，其84用例同时含阈值和换源；没有把网页PNG冒充模拟器截图。

## 使用与边界

在仓库根目录运行：

```sh
node scripts/theme-project-package.mjs /absolute/path/to/unpacked-package
node --test scripts/theme-project-package.test.mjs scripts/reference-release-v2.test.mjs
```

CLI只读校验并输出报告，不解压、不安装、不发布、不调用模型、不启动服务。程序接口`convertThemePackage(directory)`返回已绑定资源的可编辑project、各目标源码草稿和diagnostics/report。将project通过现有本地项目导入流程接入编辑器；生成完整工程时仍走现有字体准备、资源导出和SDK编译流程。不要直接把未准备字体资源的源码草稿宣称为可发布工程。

校验通过不等于SDK、模拟器、实际Sleep/功耗或真机验收。报告分别标记sdk、simulator、hardware；自动发布服务及可信上传鉴权仍是独立事项。禁止以此工具代替发布API的权限校验。
