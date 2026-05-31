import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": new URL("./app", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.{test,spec}.{ts,tsx}"],
    fileParallelism: false,
  },
});
