import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// For XAMPP: set VITE_PUBLIC_BASE=/devflow-admin/ in .env.production so assets load from a subfolder.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = (env.VITE_PUBLIC_BASE || "/").replace(/\/?$/, "/");

  return {
    base,
    plugins: [react()],
    resolve: {
      alias:
        mode === "demo"
          ? []
          : [
              {
                find: /^.*\/demo\/videoCallSamples$/,
                replacement: `${process.cwd()}/src/demo/videoCallSamples.stub.ts`,
              },
            ],
    },
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
  };
});
