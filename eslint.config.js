import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Supabase in apps/web is for Auth and the session lifecycle only; every
// piece of application data goes through apps/api (services/api/client.ts).
const SUPABASE_BOUNDARY_MESSAGE =
  "Supabase is for Auth only in apps/web: read and write application data through apps/api (services/api/client.ts).";

// Files that use the Supabase client for Auth and the session lifecycle.
const SUPABASE_AUTH_FILES = [
  "apps/web/src/services/supabase/supabase.client.ts",
  "apps/web/src/services/api/client.ts",
  "apps/web/src/app/providers/auth/AuthProvider.tsx",
  "apps/web/src/features/auth/GoogleSignInButton.tsx",
  "apps/web/src/features/auth/AuthControls.tsx",
  "apps/web/src/features/auth/AccountProfileCard.tsx",
  "apps/web/src/features/auth/OAuthCallbackHandler.tsx",
];

// Temporary: application data still read and written directly in Supabase.
// Each entry is removed as its data moves to apps/api; never add one.
const LEGACY_SUPABASE_DATA_FILES = [
  "apps/web/src/services/supabase/supabase.crud.ts",
  "apps/web/src/services/monthlyConfig/monthlyConfig.service.ts",
  "apps/web/src/services/workDay/workDay.service.ts",
  "apps/web/src/services/shift/shift.service.ts",
  "apps/web/src/services/guestDraft/guestDraft.service.ts",
  "apps/web/src/services/account/account.service.ts",
];

export default defineConfig(
  {
    ignores: ["**/dist/**", "coverage", "playwright-report", "test-results"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2020 },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["packages/domain/src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression",
          message: "Domain modules must use static imports.",
        },
        {
          selector: 'CallExpression[callee.name="require"]',
          message: "Domain modules must use static ESM imports.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\.{1,2}/|date-fns$)",
              message:
                "Domain dependencies must be internal relative imports or date-fns.",
            },
            {
              regex: "(^|/)(apps|tests)(/|$)",
              message: "Domain source cannot depend on applications or tests.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/domain/tests/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\.{1,2}/|vitest$|@shiftly/domain$|node:)",
              message:
                "Domain tests must not depend on web or browser frameworks.",
            },
            {
              regex: "(^|/)apps(/|$)",
              message: "Domain tests cannot depend on applications.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/domain",
                "@/domain/**",
                "@shiftly/domain/*",
                "@shiftly/domain/**",
              ],
              message: "Consume the engine through @shiftly/domain.",
            },
            {
              regex: "(^|/)packages/domain(/|$)",
              message:
                "Use the public package API, not a relative domain path.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    ignores: [...SUPABASE_AUTH_FILES, ...LEGACY_SUPABASE_DATA_FILES],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)supabase\\.(client|crud)$",
              message: SUPABASE_BOUNDARY_MESSAGE,
            },
            {
              // Types (Session, User) are fine; the client itself is not.
              regex: "^@supabase/",
              allowTypeImports: true,
              message: SUPABASE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    // The Auth files hold the client too: only its auth API may be used.
    files: ["apps/web/src/**/*.{ts,tsx}"],
    ignores: LEGACY_SUPABASE_DATA_FILES,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='supabase'][property.name=/^(from|rpc|functions|storage|schema)$/]",
          message: SUPABASE_BOUNDARY_MESSAGE,
        },
      ],
    },
  },
  {
    files: ["apps/api/**/*.ts"],
    languageOptions: { ecmaVersion: 2023, globals: globals.node },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)apps/web(/|$)",
              message: "The API cannot depend on the web application.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.worker,
        Deno: "readonly",
      },
    },
  },
);
