module.exports = {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["dist/**", "node_modules/**"],
  rules: {
    "import-notation": null,
    "custom-property-pattern": null,
    "custom-property-empty-line-before": null,
    "value-keyword-case": null,
    "color-hex-length": null,
    "color-no-hex": true,
    "declaration-property-value-disallowed-list": {
      "/color$/": [/(#([0-9a-fA-F]{3,8}))|rgba?\(|hsla?\(/],
      "/^background/": [/(#([0-9a-fA-F]{3,8}))|rgba?\(|hsla?\(/],
      "/^(padding|padding-top|padding-right|padding-bottom|padding-left|margin|margin-top|margin-right|margin-bottom|margin-left|gap|row-gap|column-gap|font-size|border-radius|width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|border-width)$/":
        [/\b\d+(\.\d+)?px\b/],
    },
  },
  overrides: [
    {
      files: ["src/styles/tokens.css"],
      rules: {
        "color-no-hex": null,
        "declaration-property-value-disallowed-list": null,
      },
    },
  ],
};
