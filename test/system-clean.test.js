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
import { getCacheMapForPlatform, CATEGORIES, PROTECTION } from "../src/platform.js";
import { getCacheMap } from "../src/cache-map.js";
import { PLATFORMS, isElevated, detectLinuxDistro, LINUX_DISTROS } from "../src/detector.js";

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

test("getCacheMapForPlatform returns full Linux map with expected shape", () => {
  const map = getCacheMapForPlatform(
    PLATFORMS.LINUX,
    "/home/u",
    "/home/u/.cache",
    "/home/u/.local/share"
  );

  assert.equal(Object.keys(map[CATEGORIES.PACKAGE]).length, 9);
  assert.equal(Object.keys(map[CATEGORIES.WEB]).length, 5);
  assert.equal(Object.keys(map[CATEGORIES.BUILD]).length, 8);
  assert.equal(Object.keys(map[CATEGORIES.SYSTEM]).length, 6);

  // Every entry must declare a known protection level.
  const allEntries = Object.values(map).flatMap((c) => Object.values(c));
  for (const entry of allEntries) {
    assert.ok(
      entry.protection === PROTECTION.SAFE || entry.protection === PROTECTION.PROTECTED,
      `unexpected protection value: ${entry.protection}`
    );
  }
});

test("getCacheMapForPlatform returns the same shape for macOS as Linux", () => {
  const linux = getCacheMapForPlatform(PLATFORMS.LINUX, "/h", "/h/.cache", "/h/.local/share");
  const macos = getCacheMapForPlatform(PLATFORMS.MACOS, "/h", "/h/.cache", "/h/.local/share");

  for (const category of Object.values(CATEGORIES)) {
    assert.deepEqual(
      Object.keys(macos[category]).sort(),
      Object.keys(linux[category]).sort(),
      `macOS ${category} keys differ from Linux`
    );
  }
});

test("getCacheMapForPlatform Windows uses home/cacheDir/dataDir and is non-empty", () => {
  const home = "C:\\Users\\test";
  const cacheDir = "C:\\Users\\test\\AppData\\Local";
  const dataDir = "C:\\Users\\test\\AppData\\Local";

  const map = getCacheMapForPlatform(PLATFORMS.WINDOWS, home, cacheDir, dataDir);

  for (const category of Object.values(CATEGORIES)) {
    assert.ok(
      Object.keys(map[category]).length > 0,
      `Windows ${category} bucket must not be empty`
    );
  }

  // npm: %LocalAppData%\npm-cache and %AppData%\Roaming\npm
  assert.deepEqual(map[CATEGORIES.PACKAGE].npm.paths, [
    "C:\\Users\\test\\AppData\\Local\\npm-cache",
    "C:\\Users\\test\\AppData\\Roaming\\npm"
  ]);

  // pnpm: %LocalAppData%\pnpm-cache
  assert.ok(
    map[CATEGORIES.PACKAGE].pnpm.paths.includes("C:\\Users\\test\\AppData\\Local\\pnpm-cache"),
    "pnpm cache path must include %LocalAppData%\\pnpm-cache"
  );

  // Chrome: %LocalAppData%\Google\Chrome\User Data\Default\Cache
  assert.ok(
    map[CATEGORIES.WEB].chrome.paths.some((p) =>
      p.endsWith("Google\\Chrome\\User Data\\Default\\Cache")
    ),
    "chrome cache path must end with Google\\Chrome\\User Data\\Default\\Cache"
  );

  // Windows protection values are only SAFE or PROTECTED (no stale "system").
  const allEntries = Object.values(map).flatMap((c) => Object.values(c));
  for (const entry of allEntries) {
    assert.ok(
      entry.protection === PROTECTION.SAFE || entry.protection === PROTECTION.PROTECTED,
      `unexpected protection value: ${entry.protection}`
    );
  }
});

test("getCacheMapForPlatform throws on unknown platforms", () => {
  assert.throws(
    () => getCacheMapForPlatform("freebsd", "/h", "/h/.cache", "/h/.local/share"),
    /Unsupported platform: freebsd/
  );
  assert.throws(
    () => getCacheMapForPlatform(PLATFORMS.UNKNOWN, "/h", "/h/.cache", "/h/.local/share"),
    /Unsupported platform: unknown/
  );
});

test("getCacheMap wrapper produces the same shape as direct platform call", () => {
  const sysInfo = {
    platform: PLATFORMS.LINUX,
    homedir: "/home/u",
    cachedir: "/home/u/.cache",
    datadir: "/home/u/.local/share"
  };

  const fromWrapper = getCacheMap(sysInfo);
  const fromDirect = getCacheMapForPlatform(
    PLATFORMS.LINUX,
    "/home/u",
    "/home/u/.cache",
    "/home/u/.local/share"
  );

  for (const category of Object.values(CATEGORIES)) {
    assert.deepEqual(
      Object.keys(fromWrapper[category]).sort(),
      Object.keys(fromDirect[category]).sort()
    );
  }
});

test("getCacheMap propagates unsupported-platform error from the wrapper", () => {
  const sysInfo = {
    platform: "freebsd",
    homedir: "/home/u",
    cachedir: "/home/u/.cache",
    datadir: "/home/u/.local/share"
  };

  assert.throws(() => getCacheMap(sysInfo), /Unsupported platform: freebsd/);
});

test("isElevated returns false for the test process (not running as root)", () => {
  // The test process should be running as a regular user, not root, so
  // isElevated() must return false. This is a smoke test that exercises
  // both the POSIX (process.getuid) and the Windows (System32 write
  // probe) branches — whichever one matches process.platform.
  assert.equal(typeof isElevated, "function");
  assert.equal(isElevated(), false);
});

test("detectLinuxDistro returns a known distro value or UNKNOWN", () => {
  // The function reads real /etc/os-release, so on this system it should
  // return one of the known values — never throw, never return UBUNTU
  // spuriously from a bare machine-id.
  const distro = detectLinuxDistro();
  const knownValues = new Set(Object.values(LINUX_DISTROS));
  assert.ok(knownValues.has(distro), `unexpected distro value: ${distro}`);
});

test("handleAudit --global reports <global> as the target", () => {
  const result = runCli(["audit", "--global", "--json"]);

  // The audit command always exits 0 unless it finds issues; even
  // without issues we should be able to parse the JSON.
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, "audit");
  assert.equal(parsed.target, "<global>");
});
