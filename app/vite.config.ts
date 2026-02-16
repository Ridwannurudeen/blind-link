import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, process: true, global: true },
      overrides: {
        fs: "memfs",
      },
    }),
  ],
  server: { port: 3000 },
  define: {
    "process.version": JSON.stringify("v18.0.0"),
    "process.browser": true,
    "process.env": "{}",
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
