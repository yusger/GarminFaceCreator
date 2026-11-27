import {test,expect} from "@playwright/test";
import {mkdir} from "node:fs/promises";
import {helpSections,findHelpArticles} from "../src/helpContent";
async function openHelp(page:any){await page.goto("/");await page.getByRole("button",{name:"帮助与关于",exact:true}).click();await expect(page.getByRole("heading",{name:"帮助与关于",exact:true})).toBeVisible();}
test("help search finds installation and migration guidance without executing or flattening documents",()=>{
 expect(new Set(helpSections.flatMap(s=>s.articles.map(a=>a.id))).size).toBe(helpSections.reduce((n,s)=>n+s.articles.length,0));
 expect(findHelpArticles("GARMIN/APPS").some(x=>x.article.id==="install-prg")).toBe(true);
 expect(findHelpArticles("项目不见了").some(x=>x.article.id==="missing-projects")).toBe(true);
 expect(findHelpArticles("字体 缺字").some(x=>x.article.id==="font-difference")).toBe(true);
 expect(findHelpArticles("NO_SUCH_HELP_123456")).toEqual([]);
 for(const a of helpSections.flatMap(s=>s.articles))for(const l of a.links||[])expect(new URL(l.url).protocol).toBe("https:");
});
test("help navigation, file purposes, searchable FAQ and attribution are available without writes",async({page})=>{
 const writes:string[]=[];page.on("request",r=>{if(r.method()==="POST")writes.push(r.url());});await openHelp(page);
 const nav=page.getByRole("navigation",{name:"帮助分类"});await nav.getByRole("button",{name:"导出与安装",exact:true}).click();
 await expect(page.getByRole("table")).toContainText("表盘PRG");await expect(page.getByRole("table")).toContainText("不能直接安装");await expect(page.locator('[data-help-article="install-prg"]')).toContainText("GARMIN/APPS");
 const link=page.getByRole("link",{name:"Garmin官方侧载说明"});await expect(link).toHaveAttribute("href","https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/");
 await page.getByRole("searchbox",{name:"搜索帮助"}).fill("项目不见了");await expect(page.getByRole("status")).toContainText("找到1条");await expect(page.locator('[data-help-article="missing-projects"]')).toContainText("不同浏览器");
 await page.getByRole("searchbox",{name:"搜索帮助"}).fill("NO_SUCH_HELP_123456");await expect(page.getByRole("heading",{name:"没有找到相关帮助"})).toBeVisible();await page.getByRole("button",{name:"清除搜索",exact:true}).click();await expect(nav.getByRole("button",{name:"导出与安装",exact:true})).toHaveAttribute("aria-current","page");
 await nav.getByRole("button",{name:"常见问题",exact:true}).click();const faq=page.locator('[data-help-article="missing-projects"]');await faq.locator("summary").click();await expect(faq).toContainText("设计JSON备份");
 await nav.getByRole("button",{name:"关于与致谢",exact:true}).click();await expect(page.getByRole("link",{name:"SkyRing",exact:true})).toHaveAttribute("href",/github.com\/daveshap\/SkyRingGarmin/);await expect(page.getByRole("link",{name:"fine-o-clock",exact:true})).toHaveAttribute("href",/github.com\/causeri3\/fine-o-clock/);
 await expect(page.locator("main.help-page")).toContainText("GPL-3.0-or-later");await expect(page.locator("main.help-page")).toContainText("编译服务可能记录请求IP");expect(writes).toEqual([]);
});
test("service check is explicit, handles disabled native service and hides private diagnostics",async({page})=>{
 let checks=0;await page.route("**/api/capabilities",route=>{checks++;return route.fulfill({json:{ready:true,devices:[{ready:true},{ready:false}],nativeVerification:{enabled:false,ready:false},privatePath:"PRIVATE_SERVER_PATH_SENTINEL"}});});
 await openHelp(page);await page.getByRole("navigation",{name:"帮助分类"}).getByRole("button",{name:"关于与致谢",exact:true}).click();expect(checks).toBe(0);
 await page.getByRole("button",{name:"检查服务状态",exact:true}).click();await expect(page.locator(".help-service")).toContainText("1/2个目标编译就绪");await expect(page.locator(".help-service")).toContainText("未启用，不影响工程编译");await expect(page.locator("main.help-page")).not.toContainText("PRIVATE_SERVER_PATH_SENTINEL");expect(checks).toBe(1);
 await page.unroute("**/api/capabilities");await page.route("**/api/capabilities",r=>r.fulfill({status:503,body:"PRIVATE_SERVER_PATH_SENTINEL"}));await page.getByRole("button",{name:"检查服务状态",exact:true}).click();await expect(page.locator(".help-service")).toContainText("无法检查服务状态");await expect(page.getByRole("button",{name:"检查服务状态",exact:true})).toBeEnabled();
});
test("editor help round trip preserves the current editable design and model settings entry",async({page})=>{
 page.on("dialog",d=>d.accept("Help Return"));await page.goto("/");await page.getByRole("button",{name:/^空白画布/}).click();await page.getByLabel("初始布局",{exact:true}).selectOption("blank");await page.getByRole("button",{name:"创建项目",exact:true}).click();await page.getByRole("button",{name:"时间",exact:true}).click();
 const before=await page.locator("svg.watch").first().innerHTML();await page.getByRole("button",{name:"帮助与关于",exact:true}).click();await expect(page.getByRole("heading",{name:"帮助与关于",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"返回当前设计",exact:true}).click();await expect(page.locator("svg.watch").first()).toBeVisible();expect(await page.locator("svg.watch").first().innerHTML()).toBe(before);
 await page.getByRole("button",{name:"帮助与关于",exact:true}).click();await page.locator(".help-start-actions").getByRole("button",{name:"模型配置",exact:true}).click();await expect(page.getByRole("heading",{name:"模型配置",exact:true})).toBeVisible();await page.getByRole("button",{name:"帮助与关于",exact:true}).click();await expect(page.getByRole("heading",{name:"帮助与关于",exact:true})).toBeVisible();
});
test("help page adapts to narrow screens and provides usable keyboard search",async({page})=>{
 await page.setViewportSize({width:480,height:900});await openHelp(page);await page.getByRole("searchbox",{name:"搜索帮助"}).focus();await page.keyboard.type("PRG");await expect(page.getByRole("heading",{name:"搜索结果",exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole("button",{name:"清除搜索",exact:true}).click();await page.getByRole("navigation",{name:"帮助分类"}).getByRole("button",{name:"导出与安装",exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await mkdir("Temp/help-about-validation",{recursive:true});await page.screenshot({path:"Temp/help-about-validation/mobile-install.png",fullPage:true});
});
