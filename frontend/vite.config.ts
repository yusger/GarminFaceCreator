import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "GFC_");
  const target = new URL(env.GFC_API_PROXY || "http://127.0.0.1:18380");
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.pathname !== "/"
  )
    throw Error("GFC_API_PROXY 必须是无认证、查询或路径的 HTTP(S) 后端地址");
  const port = Number(env.GFC_DEV_PORT || 5173);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("GFC_DEV_PORT 必须在 1–65535 之间");
  return {
    root: "frontend",
    plugins: [react()],
    build: { outDir: "../dist", emptyOutDir: true },
    server: {
      host: env.GFC_DEV_HOST || "127.0.0.1",
      port,
      proxy: { "/api": { target: target.origin, changeOrigin: true } },
    },
  };
});

