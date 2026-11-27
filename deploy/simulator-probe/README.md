# Linux SDK 模拟器隔离原型

实验性验证工具，尚不是网站可用的验证服务。独立 Ubuntu 22.04 GUI 依赖镜像，不能替换现有编译镜像。SDK和设备缓存只读挂载；输入只挂一个已编译PRG，输出为独立任务目录，不挂开发者密钥、后端配置或全部构建目录。

运行须指定实际编译目标DEVICE，限制CPU/内存/PID/总超时、无外部网络、无新增权限及只读根目录，HOME和/tmp用受限tmpfs；/tmp需exec以运行从只读SDK复制并赋执行位的二进制。输入PRG须从本次成功构建取得，缺失立即终止，禁止沿用旧输入。示例编排由实验记录给出；勿将主站Docker socket暴露给用户或网页。run.sh仅产生桌面截图和日志，尚不构成原生绘制成功、固定数据、AOD切换、盘面裁切或可下载服务的验收。

后续只有实际跑通GUI、PRG加载、异常识别和绘制完成条件，再做受限队列/产物API。桌面截图与浏览器截图、真机性能/功耗结论分开。

SDK模拟器还必须读取Fonts缓存（含Roboto-Regular.ttf），不能只挂Devices。执行文件从临时位置启动时，其相邻share/resources/bin布局须保持。monkeydo会在应用运行期间保持连接，不能等待进程退出作为就绪条件。本原型要求测试工程通过probeFixture注入的GFC_PROBE_FRAME_READY标记；任意用户PRG不能据此直接宣称验证通过。默认不跳过断言，模拟器提前退出、无标记、缺少字体均失败。PROBE_TRACE仅用于诊断；PROBE_HOLD_SECONDS仅允许0–30秒用于人工检查。输出mode在未核验时保持not_verified。


PROBE_READY_MARKER仅允许GFC_PROBE_FRAME_READY（专用固定数据工程）或GFC_RENDER_READY（basic-37及以后本地生成工程的一次性绘制报告）。未知值拒绝；无标记不生成通过结论。普通工程不注入测试时钟/数据，截图记录模拟器当时的数据与模式报告；报告不是独立证明真实Sleep切换、固定样本或真机行为。原生完成报告在整帧绘制后只输出一次，非每秒日志。
