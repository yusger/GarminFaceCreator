# 编译调用日志

每次 `POST /api/builds` 记录连接 IP、离线所属地、项目名称，随后记录任务编号、目标设备、完整编译器标准输出/错误输出、编译异常、最终状态和退出码。参数校验失败、队列满、取消和超时也记录。

按北京时间（UTC+8）写入 UTF-8 文件：`backend/Logs/yyyyMMdd/MMdd.log`。示例：

```text
2026-11-25 18:00:00.000 +08:00 [203.0.113.1](未知)调用编译生成表盘[ClownWatch]
2026-11-25 18:00:01.000 +08:00 [203.0.113.1](未知)[ClownWatch][任务:任务编号] ERROR: 编译器错误内容
```

Docker Compose 将宿主机 `./backend/Logs` 挂载到容器 `/data/logs`，`./runtime/geoip` 只读挂载到 `/data/geoip`。首次部署需创建 Logs 目录并赋予容器 app 用户（UID 1654）写权限；日志和离线库不提交 Git、不放入前端静态文件，容器重建不清空日志。当前日志不自动删除，由管理员按需归档。

- `GFC_LOGS`：日志根目录，非容器默认 `backend/Logs`。
- `GFC_GEOIP`：离线 IP 库目录，非容器默认 `runtime/geoip`。
- 首次部署运行 `python deploy/initialize-geoip.py`，下载固定版本、校验 SHA-256，并保留上游许可证。IPv4 和 IPv6 均本地查询，无运行时网络定位请求。
- 内网地址标为“内网/本机”，库缺失或查无记录标为“未知”；IP 所属地仅为 IP 库的近似位置。
- 使用连接地址，不信任客户端随意填写的 `X-Forwarded-For`。当前直接端口映射无需信任转发头；若后续加反向代理，需另行配置明确的可信代理。NAT 若改写源地址，只能记录服务器实际可见的地址。
- 项目名与输出中的换行、控制字符和括号会转义/替换，避免伪造日志条目；不额外记录模型 API Key、请求正文、素材内容或签名密钥。
- 单条编译器输出最多保留 16,000 字符；文件写入故障会输出到容器错误日志，启动时会检查目录是否可写。

验证：`dotnet run --project backend/tests/audit/AuditTests.csproj`；在线真实编译回归：`GFC_TEST_URL=<服务地址> node backend/tests/integration.mjs`。
