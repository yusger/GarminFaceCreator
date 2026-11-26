import { cp, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const [source, destination] of [
  ["resources/shared/fonts", "frontend/public/fonts"],
  ["resources/default-imgs/icons", "frontend/public/icon-library"],
]) {
  await mkdir(resolve(root, destination), { recursive: true });
  await cp(resolve(root, source), resolve(root, destination), {
    recursive: true,
  });
}
console.log("Shared fonts and icons published from resources/");
