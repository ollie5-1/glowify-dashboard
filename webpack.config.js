const path = require("path");
const webpack = require("webpack");

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
  ],
  performance: {
    hints: false,
  },
};
