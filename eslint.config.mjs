import pluginJs from "@eslint/js";
import globals from "globals";



const config = [
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        "Log": "readonly",
        "Module": "readonly",
      }
    }
  },
  pluginJs.configs.recommended,
];

export default config;