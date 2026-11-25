import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const target =
    loadEnv(mode, process.cwd(), "").BACKEND_ORIGIN || "http://127.0.0.1:5000";
  const proxy = { "/api": target, "/images/people": target };
  return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
