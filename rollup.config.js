import html from "@rollup/plugin-html";
import livereload from "rollup-plugin-livereload";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import serve from "rollup-plugin-serve";
import copy from "rollup-plugin-copy";
import glob from "glob";
import path from "path";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

// Modified from https://github.com/rollup/plugins/blob/master/packages/html/src/index.ts
function template({ attributes, files, meta, publicPath, title }) {
  function makeHtmlAttributes(attributes) {
    if (!attributes) {
      return "";
    }
    const keys = Object.keys(attributes);
    // eslint-disable-next-line no-param-reassign
    return keys.reduce(
      (result, key) => (result += ` ${key}="${attributes[key]}"`),
      "",
    );
  }
  const scripts = (files.js || [])
    .map(({ fileName }) => {
      const attrs = makeHtmlAttributes(attributes.script);
      return `<script src="${publicPath}${fileName}"${attrs}></script>`;
    })
    .join("\n");
  const metas = meta
    .map((input) => {
      const attrs = makeHtmlAttributes(input);
      return `<meta${attrs}>`;
    })
    .join("\n");
  return `
<!doctype html>
<html${makeHtmlAttributes(attributes.html)}>
  <head>
    ${metas}
    <title>${title}</title>
    <link rel="stylesheet" href="/pub/index.css">
  </head>
  <body class="nojs">
    <noscript>JavaScript is required for this interactive experience. Sorry!</noscript>
    ${scripts}
  </body>
</html>
`;
}

// https://github.com/rollup/rollup/issues/3414#issuecomment-751699335
const watcher = (globs) => ({
  buildStart() {
    for (const item of globs) {
      glob.sync(path.resolve(item)).forEach((filename) => {
        this.addWatchFile(filename);
      });
    }
  },
});

const is_prod = process.env["NODE_ENV"] === "production";

/** { @type import("rollup").InputOptions } */
export default {
  input: ["src/main.ts"],
  output: {
    dir: "dist",
    sourcemap: !is_prod,
  },
  plugins: [
    watcher(["pub/**"]),
    nodeResolve(),
    commonjs(),
    json(),
    typescript({
      resolveJsonModule: true,
      noImplicitAny: true,
      compilerOptions: {
        lib: ["es6", "dom"],
        target: "es6",
      },
    }),
    html({
      title: "TODO",
      template,
    }),
    copy({
      targets: [
        { src: "pub", dest: "dist" },
        { src: "scripts/dist/data.json", dest: "dist/pub" },
      ],
    }),
    livereload(),
    serve("dist"),
  ],
};
