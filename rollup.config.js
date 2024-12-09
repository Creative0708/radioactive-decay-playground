import html from "@rollup/plugin-html";
import livereload from "rollup-plugin-livereload";
import serve from "rollup-plugin-serve";

/** { @type import("rollup").InputOptions } */
export default {
  input: "src/main.ts",
  output: {
    file: "dist/bundle.js",
  },
  plugins: [html(), livereload(), serve("dist")],
};
