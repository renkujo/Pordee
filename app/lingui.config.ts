import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "th",
  locales: ["th", "en"],
  catalogs: [
    {
      path: "<rootDir>/locales/{locale}/messages",
      include: ["app"],
    },
  ],
});
