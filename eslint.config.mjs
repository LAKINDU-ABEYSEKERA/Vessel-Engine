import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ------------------------------------------------------------------
  // Default ignores from eslint-config-next
  // ------------------------------------------------------------------
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // ------------------------------------------------------------------
  // Server Component guardrail
  //
  // Route pages and layouts under src/app/app/* and src/app/sites/*
  // must remain Server Components. If you need client-side behaviour,
  // move it into a leaf component under src/components/ and import
  // that into the page.
  //
  // This rule catches the "v0 mock overwrites a Server Component"
  // class of regression that produced the last build failure.
  // ------------------------------------------------------------------
  {
    files: [
      "src/app/app/page.tsx",
      "src/app/app/**/page.tsx",
      "src/app/app/layout.tsx",
      "src/app/app/**/layout.tsx",
      "src/app/sites/page.tsx",
      "src/app/sites/**/page.tsx",
      "src/app/sites/layout.tsx",
      "src/app/sites/**/layout.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExpressionStatement[directive='use client']",
          message:
              '"use client" is not allowed in route pages or layouts. ' +
              "These must remain Server Components. Move client-only " +
              "code into a leaf component under src/components/ and " +
              "import it here.",
        },
      ],
    },
  },
]);

export default eslintConfig;