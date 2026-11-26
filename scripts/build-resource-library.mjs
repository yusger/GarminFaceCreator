import { cp, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const [source, destination] of [
  ["resources/default-imgs/brand", "frontend/public/brand"],
  ["resources/shared/fonts", "frontend/public/fonts"],
  ["resources/default-imgs/icons", "frontend/public/icon-library"],
]) {
  await mkdir(resolve(root, destination), { recursive: true });
  await cp(resolve(root, source), resolve(root, destination), {
    recursive: true,
  });
}
await cp(resolve(root,"resources/default-imgs/brand/favicon.ico"),resolve(root,"frontend/public/favicon.ico"));
console.log("Brand, shared fonts and icons published from resources/");
