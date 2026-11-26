# 内网参考表盘发布 API v1.0-draft

状态：待实现契约。**下列端点当前均未上线**，不要向现有展示站测试上传。机器接口定义见[OpenAPI 3.1文件](../../resources/schemas/reference-publishing.openapi.json)；包格式见[自动发布包规范](reference-release-package-standard.md)。

## 1. 服务边界与认证

发布接口统一使用 /api/internal/reference-… 前缀，仅内网入口开放；公网反向代理必须拒绝整个internal发布前缀。不能只靠页面隐藏按钮或仅靠CORS作为权限控制。发布者凭证与模型API Key、编译任务凭证完全分离。

每位第三方分配独立、可撤销的Bearer token，服务存储不可逆校验值并绑定publisherId、有效期和权限。权限至少区分reference:read、reference:submit、reference:publish、reference:activate；管理员在部署侧发放，不在首版公开创建凭证接口。所有管理端点要求认证，归属由token推导。客户端可查询自己的发布者身份，不能自选其他publisherId。

权限不足返回403；访问别人的任务/作品返回404。内网接口仍推荐TLS；不得在URL、ZIP或日志传token。审计记录发布者、任务、作品、版本、ZIP摘要、结果及索引变更，不记录凭证和服务器敏感路径。

公开只读库接口采用 /api/reference-library。它只暴露已发布内容，不暴露排队任务、失败包、内部日志或凭证。

### 1.1 最小权限映射

| 操作 | 权限 |
| --- | --- |
| 能力、自己的任务/报告和版本查询 | reference:read |
| 提交validate、取消自己的未完成任务 | reference:submit |
| 提交publish意图 | reference:submit和reference:publish |
| 提升自己的ready候选 | reference:publish |
| 激活自己的历史版本 | reference:activate |

各权限只对凭证所属publisher命名空间有效。自动发布机器人通常同时授予read/submit/publish；回滚权限按需另授予。OpenAPI中的x-required-scopes标明基础权限，publish意图的额外权限由请求语义检查，不能仅凭拥有Bearer token放行所有操作。

## 2. 工作流

    GET capabilities
      → POST publications（ZIP＋元数据）
      → GET publication直到终态
      → GET report检查诊断
      → publish意图成功后网站读取新索引

第三方无需交互确认、SSH、修改仓库或手动转换。submit与publish权限可以同时授予发布机器人；令牌轮换不改变作品归属。

### 2.1 能力查询

GET /api/internal/reference-publishing/capabilities

返回协议版本、认证publisherId/权限、可用生成器配置及固定版本、Project版本、目标型号/尺寸/实际像素、支持能力及资源字体ID、实际限制、SDK/worker就绪情况、必需门禁及是否启用自动发布。

调用方应先用返回值约束生成内容，不能根据规范示例假定任意设备或字段都已支持。SDK/worker不可用返回可读状态；提交时再次验证，不以查询成功保证稍后一定可以编译。

### 2.2 提交

POST /api/internal/reference-publications
Content-Type: multipart/form-data
Authorization: Bearer <publisher-token>
Idempotency-Key: <随机稳定请求键，1～128位ASCII字母数字、点、下划线、短横线>

表单字段：

| 字段 | 必需 | 规则 |
| --- | --- | --- |
| package | 是 | 唯一ZIP二进制，application/zip，不接受URL拉取 |
| packageSha256 | 是 | 整个ZIP原始字节SHA-256，小写64位十六进制 |
| intent | 是 | validate或publish；publish还要求reference:publish权限 |
| expectedCurrentVersion | 是 | none表示首次发布，否则为当前X.Y.Z；最终切换再比较 |

拒绝未知字段和多个package部分。首版同步接收并计算上传摘要、检查限额及基本ZIP头后返回202，详细解包、语义、用例和编译检查异步完成。上传字节不完整或摘要不符同步400，不创建可执行任务；清理临时字节。

202示例：

    {"jobId":"pub_01example","status":"queued","intent":"publish",
     "packageSha256":"<64位摘要>","statusUrl":"/api/internal/reference-publications/pub_01example"}

Location为statusUrl，Retry-After建议轮询间隔秒数。任务URL不是认证凭证，仍须Bearer token。

幂等键按publisherId划分。相同键和完全相同ZIP摘要、intent、expectedCurrentVersion重复提交返回原任务（202或200）；不同输入返回409 IDEMPOTENCY_CONFLICT。服务完整读取并核对摘要，不能只信调用方声明；记录至少保留24小时并在能力接口公布实际期限。超过期限重新创建任务仍受不可变版本约束。连接超时后客户端用相同键和原ZIP重试，不重新打包改变ZIP字节。

同一版本内容不可变、作品更新CAS和请求幂等是三项独立约束。validate也需要expectedCurrentVersion，但不会更改索引。

### 2.3 状态与报告

GET /api/internal/reference-publications/{jobId}
GET /api/internal/reference-publications/{jobId}/report

状态接口返回jobId、status、intent、作品键/版本（解析前可为null）、时间、当前stage、checks、summary、reportUrl、releaseUrl和expiresAt。jobId是服务生成的不透明字符串，不能当作文件路径。

状态转换：

    queued → validating → generating → compiling → ready
    ready → publishing → published               publish意图自动推进
    ready保持不变                               validate意图等待显式发布
    任一未提交状态 → failed或cancelled

ready表示结构、语义、用例和SDK门禁全部通过且不可变候选产物已经保存；不是只做完Schema检查。validate的ready候选默认保留24小时，过期后查询/提升返回410并清理候选；published历史不随任务临时保留期删除。

服务重启后须恢复状态；不可恢复的执行标失败并保留最近有效发布。不得重复创建同名release或切换已完成的指针。单个失败不影响旧版公开读取。

report返回稳定错误码、阶段、字段JSON路径、layerId、caseId、target、message及修复提示；不暴露宿主路径、令牌或未授权任务。检查项统一passed/failed/not_run/not_applicable。JSON结构通过、SDK编译通过、视觉/模拟器/真机未验证应分别列出。

原生编译输出只在有归属权限的报告中提供，去除敏感路径；不复用公网编译任务的匿名读取行为。报告中的诊断必须足够让第三方定位并自动修正重新提交。

### 2.4 显式发布与取消

POST /api/internal/reference-publications/{jobId}/publish
Authorization要求reference:publish；无请求体。

只允许ready候选。服务器复查当前凭证权限、候选保留期、当前发布策略和原提交的expectedCurrentVersion；有效后返回202进入publishing，完成后published。不再运行模型。若生成器/策略已变化并要求重验，返回409 REVALIDATION_REQUIRED，不能直接发布旧候选。

POST /api/internal/reference-publications/{jobId}/cancel

queued/validating/generating/compiling/ready可取消，清理worker进程树及临时数据。取消与最终提交必须线性化：若发布切换已开始并不可安全中止，返回409 PUBLICATION_COMMITTING；若先取消成功，就不得再发布。published不能用取消撤销；使用历史激活或管理员下架策略。

取消返回200，已cancelled重复调用仍为200。failed或published返回409。取消不改变已发布版本，且此前已耗费的编译资源不计为“未使用”。

## 3. 版本查询与回滚

GET /api/internal/reference-library/{slug}/versions

只查询token所属publisherId下作品，返回已发布不可变版本、摘要、时间、checks、当前激活标记和indexRevision；不以slug访问builtin或其他发布者。

POST /api/internal/reference-library/{slug}/activate

    {"version":"1.0.0","expectedCurrentVersion":"1.1.0"}

需要reference:activate。只能激活本作品已经成功发布且完整保留的版本。检查当前值匹配后原子更新索引，并返回当前版本及新indexRevision；不重编译、不覆盖历史、不改平台referenceId/appId。已是目标版本且expectedCurrentVersion仍匹配时返回200不额外生成版本。其他并发变更返回409 CURRENT_VERSION_CONFLICT。

首版不提供第三方删除内置参考、硬删除历史或修改他人归属的接口。回滚不会降低该作品允许下一次新版本发布的版本高水位。

## 4. 动态参考库只读接口

GET /api/reference-library

返回catalogVersion=1、revision和entries，合并builtin和publisher类别。每项包含id（builtin:slug或publisher:publisherId/slug）、referenceId、name、summary、version、category、publisherId、source、checks和不可变bundleUrl。接口生成的自主/来源标签不采信上传JSON。

使用ETag和If-None-Match，未变化304。客户端只在刷新/主动检查时拉取新索引，不能凭旧缓存误报发布失败。单个扩展包加载错误不阻止其他参考展示。首版清单不分页，服务限制活动条目总数（建议1000）；扩容需要兼容分页/增量协议。

GET /api/reference-library/releases/{publisherId}/{slug}/{version}/bundle
GET /api/reference-library/releases/{publisherId}/{slug}/{version}/files/{fileId}

fileId为服务生成的1～120位ASCII字母数字、下划线或短横线标识，与该版本发布清单映射，不是文件路径。只允许该版本已经发布并列入公开产物白名单的文件。bundle采用现有format:1、project/images/binaryAssets结构或其明确适配形式，所有资源URL绑定同一publisher/slug/version；published旧版本可用于已有副本和历史恢复。内部canonical目录/输入ZIP不直接作为静态根目录公开。

路径逐段验证，拒绝编码路径穿越、双重编码、反斜杠和任意系统文件读取。文件内容和响应类型固定；JSON使用application/json，图片只返回已校验PNG。不可变资源可长期缓存并给内容ETag；出于下架策略需失效时另行定义，不默默修改同版本字节。

公开的源文件/许可证只限发布产物中明确收录的内容，不公开任务日志、临时工作目录、签名密钥及服务器配置。公共读取不能用发布token置于URL。

## 5. 错误契约

管理端点错误统一返回application/problem+json，字段为status、code、title、detail、traceId、可选diagnostics；异步任务失败主要通过status=failed和report呈现，不把轮询HTTP200误解为任务成功。

| HTTP | 常见code | 含义 |
| --- | --- | --- |
| 400 | INVALID_REQUEST / HASH_MISMATCH | 表单、摘要或请求格式错误 |
| 401 / 403 | UNAUTHENTICATED / FORBIDDEN | 凭证失效或缺少权限 |
| 404 | NOT_FOUND | 不存在或不属于当前发布者 |
| 409 | IDEMPOTENCY_CONFLICT / VERSION_IMMUTABLE / CURRENT_VERSION_CONFLICT / PUBLICATION_COMMITTING / INVALID_STATE / REVALIDATION_REQUIRED | 幂等、版本、并发或任务状态冲突 |
| 410 | CANDIDATE_EXPIRED | 验证候选已过期 |
| 413 / 415 | PACKAGE_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE | 文件大小或类型错误 |
| 422 | PACKAGE_INVALID / CAPABILITY_UNSUPPORTED / CASE_FAILED / COMPILE_FAILED | 可解释的包或验收错误；异步时记入report而非轮询返回422 |
| 429 | RATE_LIMITED | 发布者或全局限额超出，附Retry-After |
| 503 | WORKER_UNAVAILABLE / QUEUE_FULL / STORAGE_UNAVAILABLE | 依赖、队列或存储暂不可用 |

客户端仅对网络失败、429和可恢复503按退避策略重试，提交仍使用同一幂等键；400/409/422必须依据错误修正或读取新当前版本，不能盲目循环。错误中的traceId不能作为认证凭证。

## 6. 配置与运维边界

新服务配置应落在appsettings.json的独立ReferencePublishing节；实际字段在实现时与能力接口保持一致，包括Enabled、接受的格式/生成器版本、目录、上传/解压/像素预算、候选保留期、队列/并发、每发布者/全局限额和必需门禁。令牌密钥不写入可提交配置文件。

内网发布采用独立配额，不借机器人凭证绕过现有公网编译限额；各任务仍受系统总CPU/内存/存储容量控制。建议首版并发1，测量后再提高。动态发布任务不触发npm构建、不执行ZIP中命令、不覆盖宿主源码。

首版身份发放、发布策略管理和必要下架由管理员配置；第三方日常新增/更新无需管理员逐包审批。额外人工抽查与真机验证可以随后补充，不能将尚未核验的发布标为人工批准。

## 7. 第三方请求示例

下面只是未来API的调用格式，域名是示例，不是已部署地址：

    curl --fail-with-body -X POST https://gfc-publish.internal/api/internal/reference-publications \
      -H "Authorization: Bearer $GFC_PUBLISH_TOKEN" \
      -H "Idempotency-Key: myface-1.0.0-run001" \
      -F "package=@myface-1.0.0.zip;type=application/zip" \
      -F "packageSha256=$PACKAGE_SHA256" \
      -F "intent=publish" \
      -F "expectedCurrentVersion=none"

机器人读取jobId轮询状态；published后刷新公开索引验证版本。失败时读取report修正包，用新幂等键重新提交；若输入字节完全未变且只是网络重试，复用原键。

## 8. 实现验收

必须覆盖：未认证与跨发布者、令牌撤销、相同提交重试、同键不同内容、同版本不同内容、首次发布/更新CAS、同时发布与回滚、取消提交竞态、SDK失败、服务重启和存储耗尽。动态库应证明无需网站重构建即可新增卡片，旧个人副本及旧不可变资源不受更新影响。

本阶段只定义文档、Schema、OpenAPI和示例；发布API、worker、动态加载与部署均在后续实现，不向第三方承诺现在可以调用。
