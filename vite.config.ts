import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "apps/web-app",
  plugins: [react(),tailwindcss()],
  build: { outDir: "../../apps/web-dist", emptyOutDir: true, sourcemap: true },
  server: { port: 5173, proxy: { "/v1": "http://localhost:3000", "/health": "http://localhost:3000" } },
  test: { environment: "jsdom", setupFiles: ["./src/test-setup.ts"], css: true }
});
