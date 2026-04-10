import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.unit.test.ts", "packages/*/src/**/*.integration.test.ts"],
  },
});
