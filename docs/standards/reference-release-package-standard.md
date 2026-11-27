# 自动发布参考表盘包规范 v1.0-draft

状态：接口实现前的评审契约。格式名 gfc-reference-release，formatVersion: 1。**当前程序尚未实现本规范对应的内网发布服务、动态参考库或完整发布校验器**；文中“必须”是实现及验收要求，不是当前能力承诺。

## 1. 目标与首版范围

第三方通过工具导出或自动生成一个ZIP包，提交到内网API；平台自动完成身份分配、资源整理、确定性工程生成、校验、编译及入库，不要求维护者逐包转换，也不要求第三方登录服务器或修改仓库。

首版只接受当前确定性生成器支持、可以完整表达为独立编辑器项目的设计。一个包只绑定一个明确型号/尺寸；受支持目标由发布能力接口给出。多目标发布、任意Monkey C源码、effectPrompt特殊效果、插件/脚本、嵌套复合控件及任意字体上传不属于首版。

“发布包有效”包含结构、语义、资源、用例和目标SDK检查；JSON Schema通过本身不能发布。服务器不得调用模型猜测或补全缺失设计。必要能力不支持时返回诊断，第三方自动修正重提。

## 2. 与已有格式的关系

| 格式 | 用途 | 首版发布服务的处理 |
| --- | --- | --- |
| watchface.json设计交付包 | 设计师交付布局、资源和意图 | 不直接接受；现有受限CLI不能当成通用在线转换器 |
| reference.json＋design.json内置包 | 仓库随程序维护的参考项目 | 保持原维护方式，不被发布服务覆盖 |
| 本规范publish.json＋design.json | 自动化提交可生成设计 | 本规范的新入口；design复用固定版本内部Project/Layer模型 |
| 服务端发布产物 | 注册描述、可编辑项目、生成工程、资源和报告 | 服务生成、管理并按版本提供给动态参考库 |

文档版本、发布包formatVersion、内部schemaVersion、能力配置版本、单个作品version分别维护。首版只接受Project schemaVersion 26和deterministic-v1能力配置；服务必须提供该版本校验/生成适配器，不能以安装的最新程序静默迁移上传设计。扩展兼容范围要更新能力声明及测试。

## 3. ZIP目录

ZIP根目录直接包含以下文件，不额外套一层目录，不含密码或加密条目：

    publish.json                 固定发布清单
    design.json                  固定schema26可编辑项目
    cases.json                   自动验收用例
    preview.png                  默认亮屏纯盘面
    preview-aod.png              默认息屏纯盘面
    LICENSE                      设计的完整许可证
    assets/                      可选PNG图片
    notices/                     可选素材的来源及完整许可
    README.md                    可选说明（提供则必须列入清单）

除publish.json自身外，每个实际文件都必须在files中准确声明一次；不得有重复条目、额外文件、大小写碰撞或仅Unicode大小写不同的路径。资源文件名使用ASCII，文字字段允许中文。禁止绝对路径、反斜杠、点路径、盘符、软链接、硬链接、设备条目、压缩包嵌套和远程资源。

建议初始上限（服务可收紧，能力接口公布实际值）：ZIP 20MiB、解压总计40MiB、100文件、单文件8MiB、设计JSON 2MiB、清单256KiB、160顶层控件、展开后1000层、60用例、图片最长边2048。还须检查压缩比（不超过100:1）、解码像素和解码资源预算；不能只相信ZIP元数据。预览图另受目标实际分辨率约束。

解包在隔离临时目录进行，验证规范化后的最终路径；检查与使用之间不能被替换。失败包不写入当前发布索引。

## 4. publish.json

机器结构见[发布清单Schema](../../resources/schemas/reference-release.schema.json)。完整数据示例见[示例目录](../../resources/examples/reference-release/README.md)。关键字段：

| 字段 | 规则 |
| --- | --- |
| format / formatVersion | 固定gfc-reference-release / 1 |
| slug | 3～60位小写英文、数字、短横线，以字母开头；作品本地名称 |
| version | 无前缀、无预发布/构建后缀的X.Y.Z，数字不得有多余前导0 |
| name / summary | 展示名称1～80字，简介1～500字 |
| designFile / casesFile | 固定design.json / cases.json |
| generation | mode=deterministic，profile=deterministic-v1 |
| compatibility | projectSchemaVersion=26；targets恰好1项，target/deviceSize须为服务公布的完整组合；requirements列出所需能力ID（每种层core.<kind>，所用数值来源data.<source>统一小写；资源能力按服务目录） |
| origin | 作者、original/adaptation、来源URL、固定上游commit、许可证标识及全文路径 |
| previews | active/aod的包内PNG路径，首版固定preview.png/preview-aod.png |
| bindings | 图片文件与真实图层ID对应，包含素材来源/许可文件；不得靠解析文字推导 |
| files | path、role、mediaType、bytes、SHA-256小写十六进制；不包含publish.json自身 |

original可以没有上游URL/commit；adaptation必须有HTTPS来源URL及固定40位Git commit。非Git来源不猜造commit，首版应拒绝并说明需要扩展来源证据格式。来源URL只是元数据，不由服务抓取或执行。许可证全文及实际授权要齐备，自动检测只能核对声明与完整性，不能证明上传者确实拥有权利。

publisherId、完整库ID、引用项目ID、Garmin appId、来源类别标签、核验结果、发布地址和服务器路径由平台决定，不能由清单伪造。第三方原创作品不自动获得平台“自主”标签；该标签按管理员维护的归属策略生成。

## 5. design.json

复用schema26 Project的受限提交子集，见[项目结构Schema](../../resources/schemas/reference-release-design.schema.json)。必须提供完整默认图层字段及稳定的层ID，不能把外部watchface.json或不完整的Layer补丁直接放进来。

- 顶层只允许Schema列出的字段。files、versions为空，assets为空或不提供；revision=0、codeRevision=-1。不接受代码、历史、构建记录、multiDevice、来源身份、存储版本或任意扩展字段。
- id和appId是语法有效的占位值；服务器在生成前为该作品预留平台身份，发布时对外激活，更新版本复用平台身份。上传者不得通过它们选择或覆盖已有作品。
- name、target、deviceSize必须与publish.json一致；坐标恒为454设计单位，不把表壳毫米数当作像素。
- 每层hidden=false，保留activeVisible、aod和exportIncluded各自语义。必要时间必须在亮屏和AOD可见；数字或指针时分组合需能表达真实设备时间。首版不支持只含装饰图的参考包。
- layers中的未知字段、非法枚举/类型及未声明能力须由固定版本语义校验器拒绝。Layer Schema只做结构包络检查，**没有覆盖全部内部字段**；不能将其additionalProperties许可解释成任意字段接入。
- 图片层不包含image/data URI或assetId；由bindings注入已解码检查的包内PNG并分配资源身份。bindings覆盖所有图片层且每层只有一个绑定。首版包内图片只允许静态PNG，不加载SVG、HTML、URL或外部文件。
- widget层保留完整compound.version:1及其私有层、参数和公开部件。使用schema26语义校验：引用完整、每个私有层恰好归属一个部件、实例ID独立，无跨实例/跨根引用。首版bindings只绑定顶层image；复合控件私有层仍限定当前已接入的六类基础层，不接收嵌套图片资源。
- 字体只接受服务能力目录公布的系统字体及资源字体。customFont必须与服务目录的id/family/file完全匹配，不接受包内TTF/FNT或任意路径；平台生成目标像素FNT/PNG并附上相应许可。
- 其他受控资源（内置图标、指针、天气资源）必须能在该能力配置下完整解析；无法解析的标识不得退化为默认图。
- 数据来源、有效性、单位、精度、阈值、条件显隐、进度与AOD须通过语义检查。缺失为--，合法0不当缺失；单位标签不能冒充数值转换。
- effectPrompt不得非空；说明性文字不得作为必需运行逻辑。不得执行上传包中的代码、动态表达式或命令。

发布处理器可在.NET任务编排之外使用版本固定的受限生成worker，复用TypeScript验证/生成与字体管线；该worker只运行平台代码，不能执行包内脚本。不能假定现有.NET编译服务已经具备此功能。

### 5.1 deterministic-v1已知能力限制（样包评审补充）

本节补全2026-11-26样包评审发现的交付缺口，适用于当前生成器能力。格式仍为formatVersion 1，文档仍为v1.0-draft；未改变schema26编辑器本身允许的内容。**编辑器能画出或Project校验通过，不等于该发布配置能生成。**

| 项目 | 首版发布要求 | 处理建议 |
| --- | --- | --- |
| 图层旋转 | 发布图层rotation必须为0；复合控件展开后的基础层也须遵守 | 旋转装饰可在设计侧烘焙为局部透明PNG，以顶层image＋bindings提交；不得悄悄清零角度改变设计 |
| 心率装饰 | metric且source=heartRate时必须显式metricDecoration:false | 使用纯数字心率；需要图标时使用独立受支持的文字或图片层 |
| metric数值来源 | 当前限steps、battery、seconds、distance、calories、heartRate、temperature | cases支持的预览数据字段更广，不代表均可用于确定性生成的metric |
| meter来源 | 当前限steps或battery | 其他来源不能通过改标签或预览值冒充绑定 |
| 装饰层source | text/rect/circle/line等非数据层可为空字符串；time层不通过source决定时间 | 不要求为装饰层伪造心率等数据绑定 |
| 缺失读数 | metric缺省沿用--，也可显式missingValue:"--" | 合法0与缺失分开核对 |

对话、控件公开参数或配置允许切换到heartRate时，也须确保切换后的有效metric满足metricDecoration:false；不能只检查默认来源。上述限制适用于所有亮屏/AOD和配置用例。

rotation=0指不使用图层整体旋转变换，不禁止hand按真实时间转动或ring按秒数点亮；它们通过已定义的时间/数据绑定绘制。PNG替换只用于装甲、纹理等静态局部装饰，时间、心率、步数、电量必须继续作为独立动态控件。图片文件、许可/来源、bindings、files哈希及受影响的cases需同步更新。

项目结构Schema现已加入顶层rotation、metric/meter来源和纯数字心率的检查。它仍不覆盖所有Layer语义、复合控件私有层或配置后的组合；不能以Schema通过代替完整发布门禁。后续支持任意旋转时须显式扩展能力配置与验收，不倒推当前包已经支持。

## 6. 资源及完整性

files中的bytes是解压后的实际字节数，sha256是原始文件内容SHA-256；媒体类型与实际内容必须一致。publish.json文件本身不列入清单，避免自引用哈希。API额外校验整个ZIP的SHA-256，二者用途不同。

preview图必须是基准目标实际像素的完整盘面，不含表壳、界面或说明板。active/aod分别对应cases中的default-active/default-aod。图片文件完整解码后检查尺寸、格式及资源预算，不仅检查PNG头。

预览图供核对，不用来替代真实控件，也不因编译成功宣称与设备像素一致。所有随包图片都必须有素材来源及权利说明；项目设计LICENSE不自动覆盖第三方素材。

## 7. cases.json与验收门禁

格式gfc-reference-release-cases，formatVersion:1，见[用例Schema](../../resources/schemas/reference-release-cases.schema.json)。每项包含id、mode、完整固定data、controlValues及expect。所有用例独立从design默认设置开始，controlValues仅覆盖已存在配置ID，不继承上一用例。

data采用time=HH:MM、calendarDate=有效公历日期、utcOffsetMinutes、missing、values及可选天气/日出日落字段。values的键限服务数据目录，null表示该来源缺失。需要的数据必须显式提供，**发布验收不使用网页内置样本数字兜底**。seconds是0～59；用例可提交非法传感器样本来检查缺失处理，但格式本身须有效。

expect.visibleLayerIds是该模式下最终可绘制基础层ID集合；复合层展开后使用私有基础层ID，不把父对象与私有层重复计算。expect.readings以可见time/date/text/metric层ID为键，值为固定数据下预期文本。集合顺序不重要，绘制顺序仍遵循设计。所有可见文本层必须有读数断言，不可用空expect绕过检查。

至少提供default-active和default-aod。按所用能力补齐正常、合法0、缺失、目标中间值/满值/越界、阈值两侧/边界、显隐条件和非默认配置；未使用能力无需额外用例。自动检查覆盖并逐项执行，不仅检查JSON存在。

发布硬门禁：

1. ZIP/清单/Project结构与封闭字段检查。
2. 哈希、路径、引用、字体、资源解码、许可声明和身份一致性。
3. 必要能力与目标可用性检查；不允许静默删层/丢配置，首版不接受必要能力降级。
4. 固定数据语义用例全部执行通过，时间与AOD规则通过。
5. 确定性生成、固定资源整理及指定目标的真实SDK编译成功。
6. 产物可加载、不可变版本保存及索引原子更新检查。

实际网页截图对照、模拟器及真机分别记录passed/failed/not_run/not_applicable。首版可以在前五类门禁完成后自动入库，但视觉、模拟器和真机仍可能not_run；卡片不能标为“真机验证”。若部署策略把某项额外设为必需，能力接口须公布，执行器不可用时不绕过该门禁。

## 8. 发布身份与不可变版本

完整作品键为publisherId/slug。publisherId来自认证凭证，不接受路径或JSON指定其他发布者；不允许覆盖builtin命名空间。

同一作品首次通过身份检查时由服务预留稳定referenceId和appId，供生成与SDK编译使用，首次发布时对外激活；后续任务和更新复用平台身份。预留不使失败任务成为公开作品。更新只替换不可变版本及当前指针，不改变平台身份。已进入ready/published的版本内容不可更改；修改内容必须提高版本。失败且未保留有效release的版本可修正重提，仍遵循提交幂等规则。

版本按三段整数比较，新发布必须高于该作品曾成功发布的最高版本；回滚通过选择历史版本完成，不降低最高版本计数。不同ZIP字节即使解压后相同也有不同packageSha256，不宣称ZIP哈希等价于内容语义。

发布时比较expectedCurrentVersion：none表示作品不存在，否则必须等于提交者看到的当前版本。检查在最终原子切换时再次执行；并发版本或回滚改变了当前值则失败409，不覆盖别人刚发布的结果。

用户从参考创建的个人副本保持独立，发布库升级不覆盖已有个人项目。完整版本资源必须可独立读取，前端不得从最新索引混用另一版本的字体或图片。

## 9. 运行目录与动态注册

源码仓库resources/default-watchfaces继续维护随程序发布的内置参考，不开放给第三方直接写入。扩展库建议挂载到应用外的持久目录：

    runtime/reference-library/
      incoming/          受限临时提交
      jobs/              状态与诊断，不公开
      releases/          按publisher/slug/version保存的不可变产物
      index.json         当前公开版本索引

上述是服务器实现布局，不是上传者可指定路径。发布只有全部产物准备完成后才切换索引；失败或崩溃不得留下半个可见版本。恢复任务须核对不可变产物和任务记录，不能重复编译扣费或重复切换版本。

动态读接口合并内置与扩展库，保留来源类别和命名空间。前端需实现动态索引读取、版本绑定资源、错误隔离和缓存刷新后，新增表盘才无需重建整个网站；当前程序还不具备这个动态入口。

## 10. 版本兼容与验收示例

包格式、Project及能力配置的兼容组合由内网capabilities接口给出。未知版本和未知字段拒绝，不按最新版猜测。扩大首版能力时同步Schema、语义校验、生成worker与测试；与旧包有破坏性变化时公布新格式及迁移方式。

示例包用于展示结构和自动校验，不表示发布服务已经存在，亦不等于已完成SDK/设备验收。实施时必须测试：同版本冲突、不同发布者隔离、ZIP路径攻击/资源耗尽、坏PNG、错哈希、缺字、错误用例、编译失败、并发发布、取消和断电恢复。


新增几何与内部Compound v2交付请显式参见[deterministic-v2配置补充](reference-release-v2.md)。旧v1约束保持；离线检查已实现不表示内网发布API已上线。
