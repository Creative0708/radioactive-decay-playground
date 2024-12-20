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
import terser from "@rollup/plugin-terser";
import fs from "node:fs";

const isProd = process.env["NODE_ENV"] === "production";

// Modified from https://github.com/rollup/plugins/blob/master/packages/html/src/index.ts
const template = ({ files }) => {
  const script = files.js[0];

  const css = fs.readFileSync(path.resolve("pub/index.css")).toString("utf8");

  const templatePath = path.resolve("index.html");
  const fileContents = fs.readFileSync(templatePath).toString("utf8");
  return fileContents
    .replace("{stylesheet}", () =>
      isProd
        ? `<style>${css}</style>`
        : `<link rel="stylesheet" href="pub/index.css">`,
    )
    .replace("{scripts}", () =>
      isProd
        ? `<script>${script.code}</script>`
        : `<script src="${script.fileName}"></script>`,
    );
};

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

/** { @type import("rollup").InputOptions } */
export default {
  input: ["src/main.ts"],
  output: {
    dir: "dist",
    sourcemap: !isProd,
  },
  plugins: [
    !isProd && watcher(["pub/**", "index.html"]),
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
      targets: [{ src: "pub", dest: "dist" }],
    }),

    isProd && terser(),

    !isProd && livereload(),
    !isProd && serve("dist"),
  ],
};
