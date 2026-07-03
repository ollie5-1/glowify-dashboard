const path = require("path");
const webpack = require("webpack");
const pkg = require("./package.json");

/**
 * Single-file bundle, zoals de mushroom-strategy referentie.
 * Home Assistant laadt exact één frontend-resource; LimitChunkCountPlugin
 * met maxChunks 1 forceert dat alles in dat ene bestand terechtkomt.
 */
module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "glowify-dashboard.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    // Injecteert versienummer en build-tijdstip in de bundle, zodat de
    // console-log op de demo toont welke bundle er echt draait.
    new webpack.DefinePlugin({
      __GLOWIFY_VERSION__: JSON.stringify(pkg.version),
      __GLOWIFY_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    }),
  ],
  performance: {
    hints: false,
  },
};
