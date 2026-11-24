# .NET 10 后端与远程部署

部署位置由使用者自行配置。以下以 `/opt/garminfacecreator` 为目录示例；服务地址、SSH 账号与凭据通过环境变量提供。

## 组件

- ASP.NET Core / .NET 10，提供同源前端静态文件和 API。
- Linux Connect IQ SDK 9.3.0、Java 17、Venu 4 45mm 设备包和 Garmin 字体。
- 单并发编译，队列容量 8，上传 25MB / 100 文件，编译超时 3 分钟。
- 前端查询状态和日志，成功后显示真实 PRG 下载；可请求取消任务。
- 任务元数据采用原子替换 JSON 持久化，当前不依赖 SQLite；重启时标记未完成任务中断。

## API

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| GET | /api/health | 服务存活 |
| GET | /api/capabilities | SDK、目标、限制和就绪状态 |
| POST | /api/builds | multipart：project JSON + files 文件列表，返回 202 |
| GET | /api/builds/{id} | 状态和产物列表 |
| GET | /api/builds/{id}/logs?after=cursor | 增量日志 |
| POST | /api/builds/{id}/cancel | 取消排队或编译任务 |
| GET | /api/builds/{id}/artifacts/watchface.prg | 仅成功任务可以下载 |

project 字段包含 projectId（UUID）、appId（32 位十六进制）、target（固定 venu445mm）、revision（非负整数）。文件通过 multipart filename 保留资源相对路径。

## 构建边界

- 后端不接收模型 API Key，不代理或调用模型服务。
- 校验 manifest 应用类型、应用 ID 与目标；拒绝路径越界、重复文件、外部资源路径和 XML DTD。
- 上传的 monkey.jungle 不作为执行配置，后端写入固定 source/resources 工程配置。
- 不执行上传脚本，不运行生成的 Monkey C 代码；只进行 SDK 编译。
- 工作目录按任务分隔，编译进程受超时与取消控制，标准输出和错误输出同时读取。
- 容器使用非 root app 用户，SDK、字体和签名密钥只读挂载，具备容器内存/CPU/进程数限制。
- 当前为个人私有局域网部署，不包含多用户身份认证或配额；不要直接按多租户公开服务使用。

## 持久目录

```text
/opt/garminfacecreator/
├── backend/、frontend/、deploy/、compose.yaml
├── dist/                         前端生产资源
├── deploy/publish/               .NET 可移植发布文件
└── runtime/                      不进入 Git 或应用镜像
    ├── sdk/                      Linux SDK
    ├── garmin/Devices/venu445mm/  设备包
    ├── garmin/Fonts/             字体
    ├── jobs/                     工程、日志、任务状态与 PRG
    └── secrets/developer_key     专用签名密钥
```

本项目在服务器创建独立的 RSA4096 PKCS#8 DER 签名密钥，后续构建保持不变；没有上传本机原表盘签名密钥。恢复与迁移需保留 runtime/secrets 和项目应用 ID。私钥不打印、不放到下载路由、不进入源码包。

## 更新部署

1. 本地运行 `powershell -ExecutionPolicy Bypass -File deploy/prepare.ps1`，只生成前端和后端发布文件，不启动本机服务。
2. 将源码、dist 和 deploy/publish 上传到指定服务器目录，不覆盖/删除 runtime。
3. 在服务器目录执行：

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 app
```

默认使用 `deploy/Dockerfile.runtime`，将已发布的文件装入 .NET 10 Ubuntu 运行时镜像。`deploy/Dockerfile` 另提供源码多阶段构建流程，适合具备镜像下载条件的环境。

端口默认为 18380；当前 Compose 将前端与 API 同源提供，不需要模型密钥或额外 CORS 代理。SDK 与设备包需在首次部署时准备好，不能把 Windows SDK 当作 Linux SDK 使用。

登录密码不记录在仓库。远程辅助脚本从调用进程环境读取凭据；其 SSH 客户端依赖在本机临时工具目录安装，不属于应用运行时。

## 验证命令

```powershell
dotnet build backend/GarminFaceCreator.Api.csproj -c Release
$env:GFC_TEST_URL = 'http://localhost:18380'
node backend/tests/integration.mjs
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm.cmd test
```

后端集成测试向指定测试服务提交最小工程，测试设备限制、路径越界、DTD、真实 SDK 成功编译/PRG 下载、编译失败及取消。不要把测试任务当成用户设计的真实项目。

浏览器测试指定 GFC_TEST_URL 后直接使用服务器，不启动本机 Vite。模型请求在测试中拦截，不会调用付费模型。

## 首次 SDK 初始化

准备 Linux SDK、设备、字体、密钥以及发布文件后，运行 `bash deploy/initialize-sdk.sh`。它用受信任的最小工程初始化 SDK 的 `bin/default.jungle`，再以只读 SDK 挂载启动服务；SDK 或设备包更新后需重新执行。API 就绪状态同时检查该文件。

已完成最小工程和 ClownWatch 的真实编译、PRG 下载、失败任务、取消任务以及容器重建后的任务恢复验证。没有执行外部模型付费调用，也未验证 PRG 的真机显示。任务目录目前不会自动清理。

页面内置不可删除的 ClownWatch 参考项目；点击封面创建独立副本，可直接编译，原项目不会被覆盖。
