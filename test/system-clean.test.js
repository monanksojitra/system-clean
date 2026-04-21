import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { scanCacheEntry, getDirSize } from "../src/scanner.js";
import { removeDirectory } from "../src/cleaner.js";
import {
  getProtectedCategories,
  isCategoryProtected,
  getEffectiveMinThreshold,
  isBelowMinThreshold,
  isDeepEnabledForCategory,
  getConfigCleanableCategories
} from "../src/runtime-config.js";

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), "..");
const cliPath = path.resolve(projectRoot, "bin", "system-clean.js");

function runCli(args, extraEnv = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...extraEnv
    },
    encoding: "utf8"
  });
}

test("library entrypoint imports and exposes public functions", async () => {
  const mod = await import("../src/index.js");

  assert.equal(typeof mod.quickScan, "function");
  assert.equal(typeof mod.quickScanBytes, "function");
  assert.equal(typeof mod.quickClean, "function");
});

test("scanCacheEntry detects existing paths even when first path is missing", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "system-clean-test-"));
  const existing = path.join(tempRoot, "existing-cache");
  const missing = path.join(tempRoot, "missing-cache");

  fs.mkdirSync(existing, { recursive: true });
  fs.writeFileSync(path.join(existing, "sample.txt"), "cache data");

  const result = scanCacheEntry({
    name: "test-cache",
    category: "package",
    paths: [missing, existing],
    description: "test",
    protection: "safe"
  });

  assert.equal(result.exists, true);
  assert.ok(result.size > 0);
  assert.deepEqual(result.existingPaths, [existing]);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("getDirSize returns a positive value for existing non-empty directory", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "system-clean-size-"));
  fs.writeFileSync(path.join(tempRoot, "file.bin"), "1234567890");

  const size = getDirSize(tempRoot);
  assert.ok(size > 0);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("removeDirectory blocks unsafe deletion targets", () => {
  const result = removeDirectory("/");

  assert.equal(result.success, false);
  assert.equal(result.error, "unsafe target");
});

test("runtime config normalizes protected categories", () => {
  const categories = getProtectedCategories({
    protected: ["web", "web", "unknown", "system"]
  });

  assert.deepEqual(categories, ["web", "system"]);
  assert.equal(isCategoryProtected("web", { protected: categories }), true);
});

test("runtime config normalizes minimum threshold", () => {
  assert.equal(getEffectiveMinThreshold({ minThreshold: "2048" }), 2048);
  assert.equal(getEffectiveMinThreshold({ minThreshold: -1 }), 0);
  assert.equal(isBelowMinThreshold(1024, { minThreshold: 2048 }), true);
  assert.equal(isBelowMinThreshold(4096, { minThreshold: 2048 }), false);
});

test("runtime config deep behavior respects alwaysClean and protected", () => {
  const config = {
    alwaysClean: ["web"],
    protected: ["system"]
  };

  assert.equal(isDeepEnabledForCategory("web", { deep: false }, config), true);
  assert.equal(isDeepEnabledForCategory("system", { deep: true }, config), false);
});

test("runtime config excludes protected categories from clean-all", () => {
  const categories = getConfigCleanableCategories({ protected: ["web", "system"] });

  assert.equal(categories.includes("web"), false);
  assert.equal(categories.includes("system"), false);
  assert.equal(categories.includes("package"), true);
});

test("scan command supports machine-readable json output", () => {
  const result = runCli(["scan", "--json"]);

  assert.equal(result.status, 0);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, "scan");
  assert.equal(typeof parsed.results.totalSize, "number");
  assert.equal(typeof parsed.results.totalSizeFormatted, "string");
});

test("clean command returns json error for invalid category", () => {
  const result = runCli(["clean", "invalid", "--json"]);

  assert.equal(result.status, 1);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.command, "clean");
  assert.equal(parsed.error.code, "invalid_category");
});

test("clean-all json respects protected categories config", () => {
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), "system-clean-json-"));
  const appConfigDir = path.join(configRoot, "system-clean");
  fs.mkdirSync(appConfigDir, { recursive: true });

  fs.writeFileSync(
    path.join(appConfigDir, "system-clean.json"),
    JSON.stringify(
      {
        protected: ["package", "build", "web", "system"],
        confirmAll: false,
        color: false
      },
      null,
      2
    )
  );

  const result = runCli(["clean-all", "--json", "--force"], {
    XDG_CONFIG_HOME: configRoot
  });

  fs.rmSync(configRoot, { recursive: true, force: true });

  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, "clean-all");
  assert.equal(parsed.status, "no-op");
  assert.deepEqual(parsed.protectedCategories.sort(), ["build", "package", "system", "web"]);
});
