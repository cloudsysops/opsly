const js = require("@eslint/js");

module.exports = [
  {
    ignores: [".next/**", "node_modules/**", "eslint.config.js"],
  },
  js.configs.recommended,
];
