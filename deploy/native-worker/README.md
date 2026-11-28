# 可选原生验证工作进程

独立.NET10 Unix IPC服务，当前先提供运维验证入口，主站任务接口另行接入。普通构建和默认compose不启动它；只在测试环境显式启用。主编译镜像不加入GUI依赖。GUI来自独立simulator-probe镜像，实际PRG运行在每任务独立容器。

构建：dotnet publish simulator-worker/GarminFaceCreator.SimulatorWorker.csproj -c Release -p:UseAppHost=false -o Temp/native-worker-publish；然后docker build -f deploy/native-worker/Dockerfile -t garminfacecreator-native-worker Temp/native-worker-publish。可用WORKER_BASE构建参数选择已缓存的可信.NET10运行镜像，构建上下文只能是发布产物目录。

根据实际绝对部署根目录修改appsettings.example.json中的全部路径，放runtime/native-worker/appsettings.json；GFC_HOST_ROOT须为相同绝对根目录。创建work目录及native-ipc目录，IPC目录root:1654、0750。SDK/Devices/Fonts须完整，源路径不能有逗号/换行。仅Linux；worker读取的路径同时用于宿主Docker挂载，因此宿主路径与worker内路径一致。

先构建独立simulator-probe镜像；然后docker compose -f compose.yaml -f compose.native.yaml up -d native-worker。无公网/内网TCP端口，health/verify仅经worker.sock。主站仅挂IPC目录，不挂Docker socket。**只有可信broker持有Docker socket，这是宿主管理权限边界；用户PRG容器绝不挂该socket、签名Key、后端配置或全部任务目录。** 此隔离不宣称能防御内核或Docker自身漏洞。

固定PRG子容器：network none、只读根、无cap、新增权限禁止，1CPU/768MiB/128PID；SDK/设备/字体及单PRG输入只读，tmp/home分别128/64MiB，output为16MiB tmpfs。日志驱动最多1MiB。broker本身256MiB/1CPU；唯一执行槽，无内部等待队列。期限120秒，清理另限12秒；取消、失败、完成均删除自己的容器/输入输出。清理失败停止接新任务；启动只回收带固定标签及gfc-native-32hex名称的自有遗留容器，不清理其他容器。

verify只接受最多4MiB二进制PRG、明确Venu4目标、64位小写SHA256及32位任务ID；无可选镜像/命令/路径。散列不匹配在启动容器前拒绝。RunsPerDay使用中国时区自然日和持久化计数，默认50，失败运行也计数；配置来自worker自己的appsettings，主站请求不能覆盖。根目录只放配额与短期自建目录；返回后删除输入及输出。

原生截图要求GFC_RENDER_READY报告、PRG散列一致、目标像素454/390及无显式运行时错误。当前只覆盖basic37及以后本地生成工程；旧工程/任意AI PRG没有报告会失败，不能猜测成功。截图是当时模拟器默认动态数据，应用报告的active/aod不是Sleep事件独立验收；SDK、网页、真机/功耗结论分开。资源数值是docker stats采样，内存上限不是实测峰值。输出JSON中的Success与CleanupStatus必须共同判断，未完成清理不交付通过产物。


本地发布可使用publish.ps1：构建/沙箱检查任一失败即中止，不使用旧发布目录继续部署。受限broker不使用docker cp，而以固定容器文件名读取有上限的PNG/日志，不增cap。显式IPC集成测试见test-worker.py，需要GFC_NATIVE_TEST、socket/fixture/output目录；开启负例消耗额外运行配额，只用于独立测试环境。

失败退出时保留有界日志的开头（最多16,000字符），避免长堆转储挤掉首个异常；成功截图的运行日志仍按既有预算读取。日志与docker stats采样均不能代替表盘VM内存、精确峰值或真机验证。


Trusted intranet quota opt-out: set `BuildLimits.EnforceQuotas`, `NativeVerification.EnforceQuotas` and `NativeWorker.EnforceQuotas` to `false` in the deployed appsettings files and restart the two services. Defaults and example configurations keep all three `true`. The opt-out disables API/submission rate and daily build/native limits, while continuing to charge persistent usage ledgers. Authentication, upload concurrency, per-build native attempt bound, queues, storage/timeout and container resources remain enforced. Re-enabling quotas uses existing counters. Never copy staging opt-out configuration to a public deployment.
