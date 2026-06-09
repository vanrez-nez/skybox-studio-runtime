import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      // Multiple entries → rolldown code-splits: the heavy starfield-generation code lands in its
      // own chunk (reachable only from the `starfield` entry), keeping the core `index.js` small.
      entry: {
        index: "src/index.ts",
        starfield: "src/starfield.ts",
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["three", "three/tsl", "three/webgpu"],
      output: {
        chunkFileNames: "[name]-[hash].js",
      },
    },
  },
});
