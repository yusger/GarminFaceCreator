# 固定浏览器盘面基准

维护用例 frontend/tests/capture-baselines.spec.ts 在已运行测试站驱动真正的PNG导出及截图参数下载。原创测试设计含资源数字字体、中文资源字体、Lucide图标、透明PNG、旋转半透明圆角及一个完整复合控件；不加入默认参考，不使用Rider原稿。

两尺寸454/390、亮屏/AOD各一张。固定日期、时间、秒数、心率、步数、电量，导出不改变设计；对同一次渲染重复下载并解码比较RGBA。记录浏览器精确版本/UA、视口1600×1000、DPR、字体及图标目录SHA256、渲染器版本及模式。此固定环境的容差为0个变化通道；浏览器或资源升级必须先审阅差异并显式更新，不能默默放宽误差。

执行：GFC_TEST_URL指向测试站，PLAYWRIGHT_CHANNEL选择登记浏览器，GFC_CAPTURE_BASELINES=1，然后运行 npx playwright test frontend/tests/capture-baselines.spec.ts。只有维护者显式设置GFC_UPDATE_CAPTURE_BASELINES=1才写入基准。默认跳过需固定环境的对照，不启动服务，不调用AI或SDK。

基准PNG/元数据位于frontend/tests/baselines/pure-watchface，测试工程仍是复合对象；图片导出仅是验证产物。网页系统字形仍有替代字体边界，这些像素不是原生或真机真值；跨操作系统、浏览器、硬件不使用此零容差推导一致性。
