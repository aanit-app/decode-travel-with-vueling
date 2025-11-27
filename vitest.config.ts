// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["app/**/*.test.ts"], // Only include tests inside src folder
    environment: "node",
    setupFiles: ["app/tests/setup.ts"],
  },
});
