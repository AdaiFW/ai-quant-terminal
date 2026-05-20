import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  /* ── Next.js recommended ── */
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  /* ── TailwindCSS plugin ── */
  ...compat.plugins("tailwindcss"),

  /* ── Custom rules ── */
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandFirst: true,
          reservedFirst: ["key", "ref"],
        },
      ],
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["../*"], message: "Use @/ path alias instead." }],
        },
      ],
    },
  },

  /* ── Ignore patterns ── */
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "dist/",
      "public/",
      "prisma/*.db",
      "prisma/*.db-journal",
    ],
  },

  /* ── Prettier must be last ── */
  eslintConfigPrettier,
];

export default eslintConfig;
