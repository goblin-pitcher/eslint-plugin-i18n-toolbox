"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:eslint-plugin/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    node: true,
  },
  overrides: [
    {
      files: ["tests/**/*.js"],
      env: { mocha: true },
    },
  ],
  rules: {
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-explicit-any": "off",
    // TypeScript's `noFallthroughCasesInSwitch` option is more robust (#6906)
    "default-case": "off",
    // 'tsc' already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/291)
    "no-dupe-class-members": "off",
    // 'tsc' already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/477)
    "no-undef": "off",
    // Add TypeScript specific rules (and turn off ESLint equivalents)
    "@typescript-eslint/consistent-type-assertions": "warn",
    "no-array-constructor": "off",
    "@typescript-eslint/no-array-constructor": "warn",
    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": [
      "warn",
      {
        functions: false,
        classes: false,
        variables: false,
        typedefs: false,
      },
    ],
    "no-unused-expressions": "off",
    "@typescript-eslint/no-unused-expressions": [
      "error",
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        args: "none",
        ignoreRestSiblings: true,
        varsIgnorePattern: "^Nerv|^React",
      },
    ],
    "no-useless-constructor": "off",
    "@typescript-eslint/no-useless-constructor": "warn",

    // https://github.com/typescript-eslint/typescript-eslint/issues/2471
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": "error",
    "import/order": [
      "error", // 或者 "warn" 来仅仅提醒而不是报错
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "unknown",
        ],
        pathGroups: [
          {
            pattern: "@/**",
            group: "internal",
          },
        ],
        warnOnUnassignedImports: true,
        pathGroupsExcludedImportTypes: ["builtin"],
        "newlines-between": "never",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
  },
};
