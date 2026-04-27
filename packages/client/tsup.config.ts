import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // @nahook/core is private to the monorepo (workspace package, never
  // published to npm). Bundle it into the dist so consumers don't need
  // to resolve it from the registry.
  noExternal: ["@nahook/core"],
});
