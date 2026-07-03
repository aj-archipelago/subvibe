import globals from "globals";
import pluginJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "dist/**/*",
      "coverage/**/*",
      "node_modules/**/*"
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        process: "readonly"
      }
    }
  },
  {
    files: ["*.config.cjs", "jest.config.cjs"],
    languageOptions: {
      globals: globals.node,
      sourceType: "commonjs"
    }
  },
  {
    files: ["*.config.{js,mjs,ts}"],
    languageOptions: {
      globals: globals.node,
      sourceType: "module"
    }
  },
  {
    files: ["src/__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  },
  pluginJs.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    files: ["src/__tests__/**/*.ts"],
    rules: {
      "no-useless-escape": "off"
    }
  }
];
