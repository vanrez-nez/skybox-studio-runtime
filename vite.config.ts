import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: "index.ts",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["three", "three/tsl", "three/webgpu"],
    },
  },
});
