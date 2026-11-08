import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { diminish } from "../src/index.js";
import * as api from "../src/index.js";

const root = new URL("..", import.meta.url);

test("public exports stay limited to the documented surface", () => {
  assert.deepEqual(Object.keys(api).sort(), ["diminish"]);
  assert.equal(typeof api.diminish, "function");
  assert.equal(diminish, api.diminish);
});

test("package metadata names the module and the author", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.equal(pkg.name, "@aneron/cc-diminish");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.author, "Vadim Gubin");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.sideEffects, false);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.main, "./src/index.js");
  assert.equal(pkg.exports, "./src/index.js");
  assert.equal(pkg.repository.type, "git");
  assert.equal(pkg.repository.url, "git+https://github.com/ANERON-GAMES/cc-diminish.git");
  assert.deepEqual(pkg.files, ["src", "LICENSE", "README.md"]);
  assert.equal(pkg.scripts.test, "node --test test/*.test.js");
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.format, "prettier --write .");
  assert.equal(pkg.scripts["format:check"], "prettier --check .");
  assert.equal(pkg.description.length > 0, true);
  const license = readFileSync(new URL("LICENSE", root), "utf8");
  assert.equal(license.split("\n")[2], "Copyright (c) 2026 Vadim Gubin");
  assert.equal(license.includes("Copyright (c) 2026 Vadim Gubin"), true);
  assert.equal(license.includes("anerongames"), false);
  const readme = readFileSync(new URL("README.md", root), "utf8");
  for (const heading of [
    "## Purpose",
    "## Install",
    "## Usage",
    "## API",
    "## Design notes",
    "## License"
  ]) {
    assert.equal(readme.includes(heading), true, heading);
  }
  assert.equal(readme.includes("`first.count` is `1`"), true);
  assert.equal(readme.includes("`first.duration` is `8`"), true);
  assert.equal(readme.includes("`first.immune` is `false`"), true);
  assert.equal(readme.includes("`first.resetAt` is `18`"), true);
  assert.equal(readme.includes("`second.count` is `2`"), true);
  assert.equal(readme.includes("`second.duration` is `4`"), true);
  assert.equal(readme.includes("`second.multiplier` is `0.5`"), true);
  assert.equal(readme.includes("`third.duration` is `2`"), true);
  assert.equal(readme.includes("`fourth.count` is `4`"), true);
  assert.equal(readme.includes("`fourth.immune` is `true`"), true);
  assert.equal(readme.includes("`fourth.duration` is `0`"), true);
  assert.equal(readme.includes("`held.count` is `5`"), true);
  assert.equal(readme.includes("`held.immune` is `true`"), true);
  assert.equal(readme.includes("`restored.count` is `1`"), true);
  assert.equal(readme.includes("`restored.duration` is `8`"), true);
  assert.equal(readme.includes("`rooted.count` is `1`"), true);
  assert.equal(readme.includes("`rooted.duration` is `6`"), true);
  assert.equal(readme.includes("`again.count` is `2`"), true);
  assert.equal(readme.includes("`again.duration` is `4`"), true);
  assert.equal(readme.includes("`slowed.count` is `4`"), true);
  assert.equal(readme.includes("`slowed.duration` is `3`"), true);
  assert.equal(readme.includes("`slowed.immune` is `false`"), true);
  assert.equal(readme.includes("`broken.count` is `2`"), true);
  assert.equal(readme.includes("`broken.duration` is `4`"), true);
  assert.equal(readme.includes("`early.duration` is `4`"), true);
  assert.equal(readme.includes("`boundary.duration` is `8`"), true);
  assert.equal(readme.includes("`log.length` is still `0`"), true);
  const ci = readFileSync(new URL(".github/workflows/ci.yml", root), "utf8");
  assert.equal(ci.includes("node-version: [20, 22]"), true);
  assert.equal(ci.includes("npm test"), true);
  assert.equal(ci.includes("npm run lint"), true);
  assert.equal(ci.includes("npm run format:check"), true);
});

test("source files do not contain comments, clocks, timers, or network calls", () => {
  const files = readdirSync(new URL("src/", root)).sort();
  assert.deepEqual(files, ["chain.js", "diminish.js", "index.js", "read.js", "shape.js"]);
  for (const name of files) {
    const source = readFileSync(new URL("src/" + name, root), "utf8");
    const specifiers = source.match(/from "[^"]+"/g) ?? [];
    assert.equal(specifiers.length > 0 || !source.includes("import "), true, name);
    for (const specifier of specifiers) {
      assert.match(specifier, /^from "\.\/[a-z]+\.js"$/);
    }
    assert.equal(source.includes("node:"), false, name);
    assert.equal(source.includes("require("), false, name);
    assert.equal(source.includes("/*"), false, name);
    assert.equal(source.includes("//"), false, name);
    for (const token of [
      "Date",
      "setTimeout",
      "setInterval",
      "Math.random",
      "process",
      "fetch(",
      "globalThis",
      "queueMicrotask",
      "setImmediate",
      "performance"
    ]) {
      assert.equal(source.includes(token), false, name + " " + token);
    }
  }
});

test("the lockfile resolves only from the npm registry", () => {
  const lockPath = new URL("package-lock.json", root);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(lock.lockfileVersion >= 2, true);
  const text = readFileSync(lockPath, "utf8");
  assert.equal(text.includes("git+"), false);
  assert.equal(text.includes("github:"), false);
  assert.equal(text.includes("registry.yarnpkg.com"), false);
  let resolved = 0;
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      if (typeof value.resolved === "string") {
        resolved += 1;
        assert.equal(
          value.resolved.startsWith("https://registry.npmjs.org/"),
          true,
          value.resolved
        );
      }
      for (const key of Object.keys(value)) {
        walk(value[key]);
      }
    }
  };
  walk(lock);
  assert.equal(resolved > 0, true);
});
