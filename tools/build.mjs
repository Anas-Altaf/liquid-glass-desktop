// Build: bundles src/ into
//   wallpaper/  ready to import into Wallpaper Engine (index.html, app.js, app.css, project.json, preview.jpg)
//   dist/glass-desktop.html  one self-contained file for the web
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";

const CSS = ["tokens", "base", "glass", "components", "shell", "widgets", "skins"].map(n => readFileSync(`src/styles/${n}.css`, "utf8")).join("\n");
const res = await build({ entryPoints: ["src/js/main.js"], bundle: true, format: "iife", target: ["chrome100", "safari16", "firefox115"], write: false, legalComments: "inline", charset: "utf8" });
const JS = res.outputFiles[0].text;
const html = readFileSync("src/index.html", "utf8");

mkdirSync("wallpaper", { recursive: true }); mkdirSync("dist", { recursive: true });
writeFileSync("wallpaper/app.css", CSS);
writeFileSync("wallpaper/app.js", JS);
writeFileSync("wallpaper/index.html", html.replace("<!--STYLES-->", '<link rel="stylesheet" href="app.css">').replace("<!--SCRIPTS-->", '<script src="app.js"></script>'));
copyFileSync("project.json", "wallpaper/project.json");
if (existsSync("assets/preview.jpg")) copyFileSync("assets/preview.jpg", "wallpaper/preview.jpg");

const inline = html.replace("<!--STYLES-->", () => `<style>\n${CSS}\n</style>`).replace("<!--SCRIPTS-->", () => `<script>\n${JS.replace(/<\/script/gi, "<\\/script")}\n</script>`);
writeFileSync("dist/glass-desktop.html", inline);
console.log(`built: app.js ${(JS.length / 1024).toFixed(1)} KB, app.css ${(CSS.length / 1024).toFixed(1)} KB, single file ${(inline.length / 1024).toFixed(1)} KB`);
