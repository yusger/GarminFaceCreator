import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { zipFiles, crc32 } from "../src/zip";
function unzipStored(bytes: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18),
      length = bytes.readUInt16LE(offset + 26),
      extra = bytes.readUInt16LE(offset + 28),
      name = bytes.subarray(offset + 30, offset + 30 + length).toString("utf8"),
      start = offset + 30 + length + extra;
    const data = bytes.subarray(start, start + size);
    expect(crc32(data)).toBe(bytes.readUInt32LE(offset + 14));
    files.set(name, data);
    offset = start + size;
  }
  expect(bytes.readUInt32LE(offset)).toBe(0x02014b50);
  expect(bytes.readUInt32LE(bytes.length - 22)).toBe(0x06054b50);
  return files;
}
test("source ZIP has interoperable headers CRC and safe UTF8 filenames", async () => {
  expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  const zip = zipFiles([
    { path: "source/App.mc", data: new TextEncoder().encode("// source") },
    { path: "说明.md", data: new TextEncoder().encode("中文") },
  ]);
  expect(
    unzipStored(Buffer.from(await zip.arrayBuffer()))
      .get("说明.md")!
      .toString(),
  ).toBe("中文");
  expect(() =>
    zipFiles([{ path: "../private.key", data: new Uint8Array() }]),
  ).toThrow();
});
test("exported reference source ZIP preserves notices and recompiles without model settings", async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  await page.goto("/");
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/_source_r0\.zip$/);
  const files = unzipStored(await readFile((await download.path())!));
  expect(files.has("notices/ClownWatch-Wildward-LICENSE.txt")).toBe(true);
  expect(
    [...files.keys()].some((path) =>
      /\.key$|developer_key|gfc-profiles/i.test(path),
    ),
  ).toBe(false);
  const meta = JSON.parse(files.get("gfc-export.json")!.toString());
  expect(meta.designRevision).toBe(meta.codeRevision);
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: meta.projectId,
      appId: meta.appId,
      target: meta.target,
      revision: meta.codeRevision,
      deviceSize: meta.deviceSize,
      projectName: "ExportRoundTrip",
    }),
  );
  for (const [path, data] of files)
    if (
      /^(manifest\.xml|monkey\.jungle|source\/|resources\/|assets\/)/.test(path)
    )
      form.append("files", new Blob([data]), path);
  const response = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
    method: "POST",
    body: form,
  });
  expect(response.status).toBe(202);
  const job = await response.json();
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/builds/${job.buildId}`)).json()).status,
      { timeout: 130000, intervals: [1000] },
    )
    .toBe("succeeded");
});
