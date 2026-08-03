import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  resolve: {
    alias: {
      // The host application provides this module at runtime; tests use a stub.
      "@@mimocode/cli/plugin": resolve(__dirname, "test/stubs/mimo-plugin.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["index.ts"],
      reporter: ["text", "lcov"],
    },
  },
})
