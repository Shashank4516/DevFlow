import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ["node_modules"],
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
  },
});
