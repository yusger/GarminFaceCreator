# 指针素材交付规范 v1.0

第一批样包为作者 yusger 提供的 HAND ATELIER，10套40张PNG，维护源位于 `resources/default-controls/hand-images/hand-atelier`。采用其既有 `gfc-hand-image-pack / formatVersion:1` 命名；Schema 为 `resources/schemas/hand-image-pack.schema.json`。原始PNG不改色、不描摹，原作者说明及完整许可一起保留。没有明确授权或许可证的外部素材不得加入默认库。

## PNG套装

每个包必须有 manifest.json、LICENSE、README.md，以及 hands/ 下的图片；manifest含id/version/name/authors/license/licenseFile/canvas/aod/sets。每套必须有 hour、minute、second、cap 四个资源及稳定的id、名称、说明。当前适配器要求400×400透明PNG，转轴(200,200)、初始针尖朝12点，坐标向右/下为正。保留整个画布及透明留白，不能自行裁剪后还沿用旧转轴。每文件建议小于1MB，全部彩色可见像素应在以转轴为中心半径200的安全圆内，避免旋转后越界。

针身与轴帽分开。时针角度=((hour%12)+minute/60+second/3600)*30；分针=(minute+second/60)*6；秒针=second*6。轴帽不旋转且最后绘制。浏览器和原生实现采用同一方向、同一帧时钟、同一中心。图片等比映射到控件转轴距最近边缘的最大安全正方形，控件位置和尺寸可编辑；矢量长度/尾长/线宽不改变PNG内部结构。

AOD保留时/分、隐藏秒和轴帽，时分图片按alpha轮廓着aodColor灰色。图片不提供默认自动改色，亮屏保留原配色；需要自定义配色应交付独立图片版本。添加整套会创建一个可解组的编辑器分组，之后单根可改样式与位置。项目嵌入实际PNG与版本信息，旧项目不会因库更新而换图；源码导出附上HAND ATELIER许可。第三方新包需先进入构建及验收，网页暂不提供任意插件安装。

## 矢量样式

简单几何样式采用 `gfc-hand-style / formatVersion:1`，交付 hand.json、preview.svg、LICENSE。样例在 `resources/default-controls/hands/{sword,arrow,diamond}`。geometry.kind为normalized-polygon，3～32个不自交顶点[u,v]，每项在[-1,1]；u表示横向半宽倍数，v>=0沿针尖长度，v<0沿针尾长度。默认朝上，预览与原生均用同一局部多边形旋转。禁止脚本、滤镜、自由SVG路径或把凹洞直接当作实心多边形；复杂镂空/高光使用PNG交付。

## 验收

检查Schema、路径、PNG尺寸/alpha、作者及许可，再检查12/3/6/9点方向、10:24:00和10:24:30、时分秒组合、不同尺寸、移位转轴、AOD及秒针隐藏。预览应提供单根正视图和整套组合图。SDK编译只是其中一项，性能、抗锯齿与实际AOD效果仍需模拟器/真机核对。原生PNG旋转依赖Graphics.AffineTransform及drawBitmap2，当前支持的AMOLED目标已具备相应API。
