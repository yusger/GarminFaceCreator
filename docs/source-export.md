# 源码工程导出

左侧“导出源码工程 ZIP”在浏览器中打包已应用的完整代码与当前素材。设计修改后代码过期时拒绝导出不一致的工程；JSON 项目备份仍可使用。

包内含 manifest.xml、固定 source/resources 的 monkey.jungle、Monkey C 源码、XML/SVG/字体定义与图片，以及 gfc-export.json 版本元信息、README-export.md 和适用的 notices。固定 Jungle 与后端编译路径一致，不保留任意上传的构建指令。

不包含模型配置、认证头、签名私钥、SDK、设备包或服务器任务目录。用户需自行安装匹配 SDK/设备包并使用自己的签名密钥，按包内说明编译。网页预览与字体不是原生显示保证。

参考副本记录来源；旧副本仅在完整代码与内置参考一致时推断来源，不凭名称断定许可。ClownWatch 保留 Wildward MIT 声明，并说明角色/插画权利与代码许可独立。fine-o-clock 同时保留原始 LICENCE（LGPLv3）及 README（声明 GPLv3+）并标明差异；SkyRing 的上游许可未核实，不标注为已获再分发授权。打包功能不补足缺失授权，独立生成内容也不因编辑器许可自动成为 GPL。

每包最多 200 文件/30MB；ZIP 路径禁止越界、重复及盘符。当前只有源码 ZIP 导出，尚无 ZIP 导入。
