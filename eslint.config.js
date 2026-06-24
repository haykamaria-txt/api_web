import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.cache/**",
      "**/.vite/**",
      "**/logs/**",
      "**/*.log",
      "**/*.min.js",
      ".env",
      ".env.*",
      "backend/data/**",
      ".docker/**",
      "docker-data/**",
      "postgres-data/**",
      "pgdata/**",
      ".agents/**",
      ".codex/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["backend/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["atividade/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
  },
  {
    rules: {
      "no-unused-vars": [
        "error",
        {
          args: "after-used",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  eslintConfigPrettier,
];
