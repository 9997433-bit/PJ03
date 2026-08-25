import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
  {
    // PLAN §3.1: all randomness must flow through the audited dice engine.
    files: ["src/engine/**/*.ts", "src/data/**/*.ts", "src/store/**/*.ts"],
    ignores: ["src/engine/rng.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "天道不容私掷 — use the audited dice engine in src/engine/rng.ts instead.",
        },
      ],
    },
  },
]);

export default eslintConfig;
