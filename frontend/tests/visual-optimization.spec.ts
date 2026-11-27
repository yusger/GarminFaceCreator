import { test, expect } from "@playwright/test";
import { optimizeVisual } from "../src/visualOptimization";
import { project } from "../src/domain";
import { chatFingerprint } from "../src/designChat";
const raw = (color: string) =>
  JSON.stringify({
    message: "调整配色",
    operations: [{ type: "background", color }],
  });
test("visual loop is bounded and checkpoints every accepted round, stopping repeated edits", async () => {
  let p = project("Loop", true),
    calls = 0;
  const rounds: any[] = [];
  await optimizeVisual({
    initial: p,
    limit: 5,
    signal: new AbortController().signal,
    getCurrent: () => p,
    expected: () => {},
    apply: (fp, next) => {
      expect(fp).toBe(chatFingerprint(p));
      p = next;
      return p;
    },
    request: async () => ({
      raw: raw(++calls === 1 ? "#102030" : "#203040"),
      usage: { total_tokens: 25 },
    }),
    onRound: (r) => rounds.push(r),
  });
  expect(calls).toBe(3);
  expect(rounds).toHaveLength(3);
  expect(rounds.at(-1).changes).toHaveLength(0);
  expect(p.backgroundColor).toBe("#203040");
  expect(p.designSnapshots).toHaveLength(3);
  expect(rounds[0].usage.total_tokens).toBe(25);
});
for (const failure of ["invalid", "cancel", "manual"]) {
  test(`visual loop stops ${failure} without partial writes or later requests`, async () => {
    let p = project("Fail", true),
      calls = 0;
    const c = new AbortController(),
      rounds: any[] = [];
    await expect(
      optimizeVisual({
        initial: p,
        limit: 5,
        signal: c.signal,
        getCurrent: () => p,
        expected: () => {},
        apply: (_, next) => {
          p = next;
          return p;
        },
        request: async () => {
          calls++;
          if (calls === 1) return { raw: raw("#102030") };
          if (failure === "cancel") c.abort();
          if (failure === "manual") p = { ...p, backgroundColor: "#405060" };
          return {
            raw:
              failure === "invalid"
                ? raw("#203040").replace('"background"', '"script"')
                : raw("#203040"),
          };
        },
        onRound: (r) => rounds.push(r),
      }),
    ).rejects.toThrow();
    expect(calls).toBe(2);
    expect(rounds).toHaveLength(1);
    expect(p.backgroundColor).toBe(
      failure === "manual" ? "#405060" : "#102030",
    );
  });
}
test("visual loop hard limit prevents requests before work", async () => {
  let calls = 0;
  const p = project("Limit", true);
  await expect(
    optimizeVisual({
      initial: p,
      limit: 6,
      signal: new AbortController().signal,
      getCurrent: () => p,
      expected: () => {},
      apply: (_, p) => p,
      request: async () => {
        calls++;
        return { raw: raw("#102030") };
      },
      onRound: () => {},
    }),
  ).rejects.toThrow(/1–5/);
  expect(calls).toBe(0);
});
test("browser explicitly starts visual rounds, stops on no changes and restores checkpoint", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([
        {
          id: "loop",
          name: "视觉测试",
          url: "https://api.example.com/v1",
          model: "vision",
          key: "",
          remember: false,
          supportsImages: true,
          temperature: 0.2,
          tokens: 8192,
        },
      ]),
    );
  });
  let count = 0;
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      count++;
      const content = route.request().postDataJSON().messages.at(-1).content;
      expect(content.some((c: any) => c.type === "image_url")).toBe(true);
      await route.fulfill({
        json: {
          usage: { total_tokens: 50 },
          choices: [
            {
              message: {
                content:
                  count === 3
                    ? JSON.stringify({ message: "已满足", operations: [] })
                    : raw(count === 1 ? "#102030" : "#203040"),
              },
            },
          ],
        },
      });
    },
  );
  page.on("dialog", (d) => d.accept("VisualLoopUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "AI 设计助手", exact: true }).click();
  await page.getByLabel("发送当前亮屏截图", { exact: true }).check();
  await page.getByLabel("设计对话输入").fill("调整深蓝背景");
  await page.locator(".visual-rounds summary").click();
  await expect(page.getByLabel("视觉优化轮数")).toHaveValue("3");
  await page.getByRole("button", { name: "开始自动优化", exact: true }).click();
  await expect(page.locator(".visual-rounds")).toContainText(
    "没有新的有效修改",
  );
  expect(count).toBe(3);
  await expect(page.locator(".visual-rounds")).toContainText(
    '"total_tokens":50',
  );
  await page
    .getByRole("button", { name: "恢复第1轮检查点", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await expect(
    page.getByText("视觉优化 · 开始前", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("视觉优化 · 第2轮", { exact: true }),
  ).toBeVisible();
});

test("browser manual edits abort outstanding visual call and prevent late changes",async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("gfc-profiles",JSON.stringify([{id:"loop",name:"视觉测试",url:"https://api.example.com/v1",model:"vision",key:"",remember:false,supportsImages:true,temperature:0.2,tokens:8192}])));
 let count=0,release=()=>{};await page.route("https://api.example.com/v1/chat/completions",async route=>{count++;await new Promise<void>(r=>{release=r;});await route.fulfill({json:{choices:[{message:{content:raw("#102030")}}]}}).catch(()=>{});});
 page.on("dialog",d=>d.accept("ConflictLoop"));await page.goto("/");await page.getByRole("button",{name:/^空白画布/}).click();await page.getByLabel("初始布局",{exact:true}).selectOption("blank");await page.getByRole("button",{name:"创建项目",exact:true}).click();await page.getByRole("button",{name:"AI 设计助手",exact:true}).click();await page.getByLabel("发送当前亮屏截图",{exact:true}).check();await page.getByLabel("设计对话输入").fill("改背景");await page.locator(".visual-rounds summary").click();await page.getByRole("button",{name:"开始自动优化",exact:true}).click();await expect.poll(()=>count).toBe(1);
 await page.getByRole("button",{name:"时间",exact:true}).click();release();await expect(page.getByRole("alert")).toContainText("设计已变化");expect(count).toBe(1);await expect(page.locator(".visual-rounds article")).toHaveCount(0);await expect(page.locator(".layer-row")).toHaveCount(1);
});
