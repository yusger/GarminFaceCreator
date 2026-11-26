import { readFile, readdir, mkdir, cp, writeFile } from "node:fs/promises";
import { validateWidgetPackage } from "./validate-widget-package.mjs";
const entries = [];
for (const d of await readdir("resources/default-controls/widgets", {
  withFileTypes: true,
})) {
  if (!d.isDirectory()) continue;
  const dir = "resources/default-controls/widgets/" + d.name;
  await validateWidgetPackage(dir);
  const widget = JSON.parse(await readFile(dir + "/widget.json", "utf8"));
  if (
    widget.id !== d.name ||
    widget.resources.length ||
    widget.layers.some(
      (l) =>
        !["text", "metric", "rect", "circle", "line", "meter"].includes(l.kind),
    )
  )
    throw Error("Unsupported widget adapter capability: " + d.name);
  const license = await readFile(dir + "/" + widget.origin.licenseFile, "utf8");
  const notice =
    widget.name +
    " / " +
    widget.id +
    " v" +
    widget.version +
    " / " +
    widget.origin.authors.join(", ") +
    " / " +
    widget.origin.license +
    "\n" +
    (await readFile(dir + "/ADAPTATION.md", "utf8"));
  entries.push({ ...widget, licenseText: license, notice });
  await mkdir("frontend/public/widgets/" + d.name, { recursive: true });
  await cp(dir, "frontend/public/widgets/" + d.name, { recursive: true });
}
await writeFile(
  "frontend/src/widgetCatalog.json",
  JSON.stringify(entries, null, 2) + "\n",
);
console.log("Editable widget packages:", entries.length);
