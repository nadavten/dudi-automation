const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/handler.js"],
    bundle: true,
    outfile: "dist/handler.js",
    platform: "node",
    target: "node18",
    external: ["playwright-aws-lambda", "playwright-core"],
    minify: false,
    sourcemap: true,
  })
  .then(() => console.log("Build complete: dist/handler.js"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
