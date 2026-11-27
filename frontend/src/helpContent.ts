export type HelpSectionId="start"|"install"|"faq"|"design"|"about";
export type HelpArticle={id:string;title:string;paragraphs:string[];steps?:{title:string;text:string}[];bullets?:string[];links?:{label:string;url:string}[];tags?:string[]};
export const helpSections:{id:HelpSectionId;label:string;description:string;articles:HelpArticle[]}[]=[
 {id:"start",label:"快速开始",description:"先完成可编辑设计，再生成工程和安装文件。",articles:[
  {id:"choose-device",title:"1. 选择你的手表",paragraphs:["创建项目时选择系列、型号和表壳尺寸，再确认屏幕分辨率。45mm、41mm是表壳尺寸，不是画布像素；例如Venu 4两种尺寸分别对应454×454和390×390。","同一项目可使用共享主设计和不同设备变体。切换预览设备不等于已经为所有型号生成安装文件，编译时仍需明确目标。"],tags:["型号","分辨率","多设备"]},
  {id:"create-design",title:"2. 从喜欢的起点开始",paragraphs:["空白画布适合自由设计；布局模板可作为构图起点；内置表盘会创建可编辑的本地副本，原参考不可删除。","AI创建先返回可编辑的表盘项目。采用后可以手动调整，也可以打开AI设计助手继续对话；满意后再生成工程，避免每次改布局都重新消耗代码生成Token。"]},
  {id:"edit-controls",title:"3. 调整图层和复合控件",paragraphs:["添加时间、数据、图片或图形，调整位置、颜色、字号和数据来源。复合控件是一个完整对象，内部部件可以分别启用、隐藏或设置亮屏/息屏表现。","表盘配置用于当前预览和后续工程。修改设计或配置后，需要重新生成工程并编译，已下载的PRG不会自动更新。"]},
  {id:"preview-design",title:"4. 检查亮屏、息屏和极值",paragraphs:["打开预览，暂停实时模拟，再检查固定时间、低电量、缺失数据、长读数与负温度等场景。网页心率和步数是模拟数据，不是从佩戴中的手表读取。","下载亮屏或息屏盘面可以保存PNG效果图；截图参数用于复现预览条件。网页截图、SDK原生截图和真机显示是不同的验证结果。"]},
  {id:"generate-build",title:"5. 生成工程，再独立编译",paragraphs:["支持范围内可选择“本地生成（试验）”，不调用模型。需要特殊原生效果时，使用“AI生成代码”生成完整工程，审阅后点击“应用生成结果”。","点击“编译”才会将工程与所需资源提交到编译服务。编译成功后下载与目标型号匹配的PRG；编译已有工程不会再次调用AI。"],tags:["生成完整工程","费用","Token"]}
 ]},
 {id:"install",label:"导出与安装",description:"先分清你下载的是什么，再选择保存、验证或安装。",articles:[
  {id:"install-prg",title:"把PRG安装到手表",paragraphs:["下载后先核对具体型号与尺寸，例如Venu4_45mm_ClownWatch.prg。不同型号即使分辨率相同，也不应直接共用同一个PRG。"],steps:[
   {title:"准备安装文件",text:"在项目中生成并应用当前工程，编译成功后下载对应设备的.prg文件。"},
   {title:"连接电脑",text:"使用支持数据传输的数据线连接手表，按该型号的说明进入可访问设备存储的模式。只有充电功能的数据线无法传文件。"},
   {title:"复制到表盘目录",text:"打开手表存储中的GARMIN/APPS目录，将.prg文件复制进去。不要把设计JSON、PNG图片或源码ZIP当成安装文件。"},
   {title:"断开并选择表盘",text:"完成传输后安全断开设备，在手表的表盘列表中选择新表盘。具体菜单名称及USB连接方式依型号而定。"},
   {title:"检查真实效果",text:"核对时间、读数、字体、边缘裁切和息屏表现。先观察显示与稳定性，再评估长时间使用的电量变化。"}
  ],links:[{label:"Garmin官方侧载说明",url:"https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/"}],tags:["USB","数据线","侧载","GARMIN/APPS"]},
  {id:"verify-native",title:"先在模拟器里看一眼",paragraphs:["如果当前部署启用了原生验证，新版本Venu 4本地工程编译成功后，可以在编译面板点击“运行SDK模拟器”，查看和下载原生截图与验证报告。它使用已有编译任务，不能随意上传一个外部PRG在网页中运行。","这项服务是可选的，与编译状态独立；未启用时仍可下载PRG。模拟器使用自己的动态数据，不会自动与网页固定样本相同，也不能代替真机或续航测试。"],tags:["原生验证","截图","模拟器"]},
  {id:"source-zip",title:"在自己的电脑上编译或调试",paragraphs:["编辑器可以导出源码工程ZIP，包含工程文件、所需资源和适用的来源声明。解压后使用自己的Connect IQ SDK、目标设备包和签名密钥构建，具体命令见包内README-export.md。","ZIP不包含SDK或私钥；浏览器效果图也不是可运行程序。使用Garmin的Monkey C扩展或SDK工具，选择与工程相符的设备进行模拟调试。"],links:[{label:"Garmin VS Code扩展指南",url:"https://developer.garmin.com/connect-iq/reference-guides/visual-studio-code-extension/"}]},
  {id:"remote-install",title:"可以蓝牙安装或直接上架吗？",paragraphs:["本站暂不提供蓝牙、手机直传或远程安装任意PRG的功能。目前可使用USB侧载。通过Connect IQ商店安装属于另一条发布流程。","编译得到PRG不等于已经完成商店发布；发布还需单独准备商店要求的工程产物、资料和审核。"]}
 ]},
 {id:"faq",label:"常见问题",description:"按现象查原因，保留设计后再处理问题。",articles:[
  {id:"missing-projects",title:"换浏览器、域名或电脑后，为什么项目不见了？",paragraphs:["我的表盘和素材保存在当前浏览器的本地工作区，不自动同步到服务器或其他电脑。同一电脑上，不同浏览器、浏览器用户、协议、域名或端口也可能对应不同存储空间。","迁移前导出设计JSON备份；清理网站数据、使用无痕模式或浏览器存储被回收，都可能影响本地项目。安装文件PRG不能反向恢复可编辑设计。"],tags:["备份","本地存储","HTTPS","迁移","导入"]},
  {id:"preview-real-data",title:"预览中的时间、心率和步数是真实数据吗？",paragraphs:["预览使用当前时间和模拟数据，帮助检查布局；网页不会自动读取你手表上的传感器。原生工程按已接入的数据源读取设备或缓存信息。","数据可能因设备能力、传感器状态或缓存暂缺而显示--。缺失、合法0和设备不支持是不同情况，不要用固定数字冒充真实读数。"]},
  {id:"compile-failure",title:"编译失败，应该先看哪里？",paragraphs:["先确认目标设备和当前工程是否匹配，检查编译日志中的首个错误；设计修改后，确认已重新生成并应用工程。AI输出并不保证一次编译成功。","生成检查可定位部分问题。需要反馈时使用本地诊断包，先检查导出内容和脱敏结果；不要提交API Key、任务访问凭证或未确认可公开的素材。"],tags:["报错","日志","诊断包","生成检查"]},
  {id:"download-expired",title:"下载提示任务不存在、过期或凭证失效怎么办？",paragraphs:["编译任务及产物有保留期，查询和下载还需要该任务的浏览器会话凭证。清理会话、换浏览器或等待超过保留期后，旧下载可能无法继续访问。","保留本地设计和工程，必要时重新编译。不要通过分享带凭证的请求来公开任务，下载后可以自行保存PRG。"],tags:["404","下载失败"]},
  {id:"quota",title:"为什么提示排队、次数限制或429？",paragraphs:["编译和原生验证分别受部署者配置的队列、超时、保留期和配额约束。同一公网IP的访问者可能共享额度，具体限制以当前服务提示为准。","不要连续重复提交；已有编译任务可继续观察日志。达到额度后按提示等待恢复，模型费用和服务器编译配额是两回事。"]},
  {id:"models-fail",title:"AI连接失败或提示不支持图片怎么办？",paragraphs:["在模型配置中核对服务商、Base URL、模型ID和API Key，先做连接测试。浏览器直连还需要对方接口允许相应的跨域请求；页面可访问不代表API一定可直连。","只有确认所选模型及接口支持图片时才使用图片输入。不支持时可以保留文字要求并换模型；不要用关闭浏览器安全保护的方式解决跨域问题。"],tags:["CORS","模型配置","API","付费"]},
  {id:"source-settings",title:"修改数据、图标或颜色后，手表为什么没变化？",paragraphs:["网页里的设计和表盘配置不会更新已经安装的PRG。重新生成、应用工程，再编译并安装新文件。","开启自动格式时，标签、后缀和精度按来源联动；静态图标只按你明确选择的联动规则隐藏或恢复。独立圆环/仪表的目标是设计值，不代表Garmin个性化目标。"]},
  {id:"font-difference",title:"网页好看，手表上却溢出、缺字或颜色不同？",paragraphs:["浏览器替代字体与设备字体的字形、字号、字重可能不同，屏幕像素和色深也会影响细节。使用已登记资源字体并检查所需字符，再通过SDK与真机核对。","先测最长读数、中文、负号、小数和单位，给圆屏边缘留出空间。把编译成功与显示正确分开检查；截图不能证明真机功耗。"],tags:["乱码","字体","裁切","铺满屏幕"]},
  {id:"native-disabled",title:"为什么看不到原生验证，或不能运行模拟器？",paragraphs:["原生验证默认关闭，需要部署者准备并启用独立服务。当前网页入口先支持Venu 4两尺寸的新版本本地生成工程，并要求已有成功编译任务。","服务未就绪或目标/工程不在支持范围时，不会强行运行；编译和PRG下载仍保持独立。可以在“关于与致谢”中手动检查服务状态。"]},
  {id:"builtin-delete",title:"内置参考为什么不能删除？复合控件为何只有一个图层？",paragraphs:["内置参考用于提供稳定的起点。打开后使用本地副本，个人项目可以单独编辑和删除。","复合控件按一个整体管理，内部部件通过公开参数和开关调整。需要精细修改时可使用已有内部编辑或显式拆解，不必为了移动或缩放先拆散它。"]}
 ]},
 {id:"design",label:"设计提醒",description:"让表盘在真实尺寸下易读，也为缺失数据和息屏留好位置。",articles:[
  {id:"readability",title:"先让时间和关键数据容易读",paragraphs:["建立时间、关键数据、辅助装饰的层次。不要只在放大的编辑画布上判断字号；在目标实际像素和小尺寸预览下检查可读性。"],bullets:["数字与背景保持足够对比，避免把细小文字压在复杂纹理上。","测试最长读数、0、--、负数与小数，不只看默认样本。","圆屏角落不是安全区域，边界辅助圈只是设计提示，不是所有设备的官方安全区。"]},
  {id:"layered-art",title:"装饰和真实数据分别保留",paragraphs:["背景和复杂纹理可以使用局部位图；时间、读数、可变色图形应保留为可编辑控件。需要随数值填充的进度条，使用已实现的数据绑定与目标。","效果提示词用于描述后续原生工程意图，不代表网页已经实现扫描、发光或动画。必要效果不能实现时，应保留明确限制，而不是悄悄删掉。"]},
  {id:"aod-budget",title:"为息屏和资源留出预算",paragraphs:["单独设计AOD：保留必要时间和数据，减少大面积高亮装饰，不依赖秒级动画。图片可能保留自身颜色，不能仅靠修改文字色假定整盘都变暗。","查看素材实际像素、透明度、图集和解码估算。小体积PNG不一定占用更少运行内存；减少重复大图，使用已登记且覆盖所需字符的字体。最终耗电要在真实设备上观察。"]},
  {id:"acceptance",title:"分层验证，再决定发布",paragraphs:["依次检查设计结构、网页预览、工程生成、SDK编译、原生模拟器和真实设备。每层发现的问题分别修正，不能用上一层成功代替下一层验收。","采用系统字体或分片曲线等近似时，核对页面列出的实际行为。采用记录只对应当前设计、设备与代码版本；它不会把未验证能力变成支持。"],links:[{label:"Garmin界面设计指南",url:"https://developer.garmin.com/connect-iq/user-experience-guidelines/"}]}
 ]},
 {id:"about",label:"关于与致谢",description:"独立开源的表盘设计工作台，设计、工程和编译各自可控。",articles:[
  {id:"about-gfc",title:"关于GarminFaceCreator",paragraphs:["GarminFaceCreator提供可视化编辑、AI创建设计和对话调整、确定性/AI工程生成，以及后端Connect IQ编译。项目仍在开发中，网页效果与设备能力有明确边界。","这是独立开源项目，与Garmin官方产品无隶属关系。代码使用GPL-3.0-or-later；独立设计、角色图片、字体及第三方参考的权利，应按其实际来源和许可分别核对。"],links:[{label:"项目源码与README",url:"https://github.com/yusger/GarminFaceCreator"},{label:"反馈问题",url:"https://github.com/yusger/GarminFaceCreator/issues"},{label:"查看代码许可证",url:"https://github.com/yusger/GarminFaceCreator/blob/main/LICENSE"}]},
  {id:"privacy",title:"你的数据去了哪里？",paragraphs:["项目和导入素材通常保存在当前浏览器。只有你明确执行工程编译时，所需工程与资源才提交到编译服务；你选择发送给AI的结构、截图或参考图会发送至自己配置的模型接口。","API Key在浏览器配置中使用，可按你的选择保留在会话或本地；设计导出与任务链接不应携带Key。编译服务可能记录请求IP、项目名称和错误日志；具体配额与保留期由部署者配置。","本地请求记录有数量/空间限制并支持清除，图片本体不进入请求记录。需要迁移或长期保存的设计，请主动导出备份。"],tags:["安全","隐私","上传","保存","费用"]},
  {id:"service-status",title:"编译与模拟器服务状态",paragraphs:["点击下方检查只读取当前部署的能力状态，不提交工程、不创建任务，也不调用模型。部分设备就绪不代表所有设备或真机均已验证。"]},
  {id:"credits",title:"感谢开源作者与素材项目",paragraphs:["内置参考保留各自的来源、许可与适配范围。特别感谢SkyRing、fine-o-clock及其他参考项目的作者，也感谢Lucide、Meteocons和字体作者。下方列出当前内置参考的实际来源。"],links:[{label:"Lucide图标",url:"https://github.com/lucide-icons/lucide"},{label:"Meteocons天气图标",url:"https://github.com/basmilius/meteocons"}]},
  {id:"documentation",title:"更多文档与交付规范",paragraphs:["需要自行编译、交付控件或接入参考包时，可查看仓库内的完整文档。文档中的待实现接口与未验证设备不能当作已上线能力。","本页参考Whiz.tools文档的分类组织，内容按GarminFaceCreator实际功能重新编写；安装操作以Garmin官方说明及具体设备为准。"],links:[{label:"规范文档目录",url:"https://github.com/yusger/GarminFaceCreator/tree/main/docs/standards"},{label:"原生验证说明",url:"https://github.com/yusger/GarminFaceCreator/blob/main/docs/native-verification.md"},{label:"功能实施与验证边界",url:"https://github.com/yusger/GarminFaceCreator/blob/main/docs/plan-implementation-status.md"},{label:"Whiz.tools文档组织参考",url:"https://whiz.tools/zh/design-graphics/garmin-watch-face-designer"}]}
 ]}
];
export function findHelpArticles(query:string){const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);return helpSections.flatMap(section=>section.articles.map(article=>({section,article}))).filter(({section,article})=>{const text=[section.label,article.title,...article.paragraphs,...(article.bullets||[]),...(article.steps||[]).flatMap(s=>[s.title,s.text]),...(article.tags||[])].join(" ").toLocaleLowerCase();return terms.every(term=>text.includes(term));});}
