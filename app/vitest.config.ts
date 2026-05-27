import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.d.ts", "src/lib/db.ts", "src/lib/prisma.ts"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
});
