import { skyRingLayers } from "./skyring-layers.mjs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { layer } from "../frontend/src/domain.ts";
for (const [name, index] of [
  ["SkyRing", 2],
  ["fine-o-clock", 3],
]) {
  const root = path.resolve("..", "WatchFace", name),
    files = [],
    assets = [];
  async function collect(relative, destination = relative) {
    for (const entry of await readdir(path.join(root, relative), {
      withFileTypes: true,
    })) {
      const from = relative + "/" + entry.name,
        to = destination + "/" + entry.name;
      if (entry.isDirectory()) await collect(from, to);
      else if (/\.(mc|xml|svg|fnt)$/.test(entry.name)) {
        let content = await readFile(path.join(root, from), "utf8");
        // Linux uses case-sensitive resource paths; normalize the upstream font names.
        if (entry.name === "fonts.xml" && name === "fine-o-clock")
          content = content
            .replaceAll("tifBig", "TIFBig")
            .replaceAll("tifSmall", "TIFSmall")
            .replaceAll("tifTiny", "TIFTiny");
        files.push({ path: to, content });
      } else if (/\.(png|jpg|jpeg)$/.test(entry.name))
        assets.push({
          path: to,
          data:
            "data:image/png;base64," +
            (await readFile(path.join(root, from))).toString("base64"),
        });
    }
  }
  files.push(
    {
      path: "manifest.xml",
      content: await readFile(path.join(root, "manifest.xml"), "utf8"),
    },
    {
      path: "monkey.jungle",
      content:
        "project.manifest = manifest.xml\nbase.sourcePath = source\nbase.resourcePath = resources\n",
    },
  );
  await collect("source");
  await collect("resources");
  if (name === "fine-o-clock")
    await collect("resources-round-454x454", "resources");
  const layers =
    name === "SkyRing"
      ? skyRingLayers()
      : [
          {
            ...layer("image"),
            name: "动画场景背景（静帧）",
            x: 0,
            y: 0,
            w: 454,
            h: 454,
            locked: true,
            image:
              "data:image/png;base64," +
              (
                await readFile(
                  path.join(root, "resources-round-454x454/drawables/0.png"),
                )
              ).toString("base64"),
          },
        ];
  if (name === "fine-o-clock")
    layers.push(
      {
        ...layer("time"),
        name: "时间",
        x: 155,
        y: 40,
        w: 175,
        h: 80,
        size: 45,
        color: "#000000",
        aod: true,
      },
      {
        ...layer("metric"),
        name: "杯子数据",
        source: "seconds",
        x: 305,
        y: 260,
        w: 72,
        h: 40,
        size: 30,
        color: "#000000",
        threshold: false,
      },
    );
  const result = {
    schemaVersion: 1,
    id: `00000000-0000-4000-8000-00000000000${index}`,
    appId: files[0].content.match(
      /application\s+[^>]*?\bid="([a-f0-9-]+)"/i,
    )[1],
    name,
    updated: Date.now(),
    revision: 0,
    layers,
    files,
    assets,
    codeRevision: 0,
    versions: [],
  };
  await writeFile(
    `frontend/public/templates/${name.toLowerCase()}.json`,
    JSON.stringify(result),
  );
  console.log(
    name,
    files.length,
    "source files",
    assets.length,
    "binary assets",
  );
}
