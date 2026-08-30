/**
 * Cleaner Module
 * Cleans cache directories
 */

import fs from "fs";
import path from "path";
import { scanCacheEntry, getDirSize, formatSize } from "./scanner.js";
import { CATEGORIES, getCategoryCaches, shouldCleanCache } from "./cache-map.js";

import { isElevated, getHomeDir, getCacheDir, getDataDir, getTempDir } from "./detector.js";
import { loadConfig } from "./config.js";

function safeRealpath(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return p;
  }
}

function isUnsafeDeletionTarget(dirPath) {
  const resolved = path.resolve(dirPath);
  const realResolved = fs.realpathSync.native(resolved); // Resolve symlinks

  const rootPath = path.parse(realResolved).root;
  const homePath = safeRealpath(getHomeDir());
  const cachePath = safeRealpath(getCacheDir());
  const dataPath = safeRealpath(getDataDir());
  const tempPath = safeRealpath(getTempDir());

  // Refuse if running as root
  if (isElevated()) return true;

  // Basic checks (root, home, too short)
  if (realResolved === rootPath) return true;
  if (realResolved === homePath) return true;
  if (realResolved.length < 5) return true; // Catches paths like /tmp, /var, etc. too easily if not careful

  // Must be strictly inside home, cache, data, or temp directories
  const isUnderHome = realResolved.startsWith(homePath) && realResolved !== homePath;
  const isUnderCache = realResolved.startsWith(cachePath) && realResolved !== cachePath;
  const isUnderData = realResolved.startsWith(dataPath) && realResolved !== dataPath;
  const isUnderTemp = realResolved.startsWith(tempPath) && realResolved !== tempPath;

  if (!isUnderHome && !isUnderCache && !isUnderData && !isUnderTemp) {
    return true;
  }

  // Deny-list sensitive directories under home (even if they are technically subdirectories)
  const sensitivePaths = [
    path.join(homePath, ".ssh"),
    path.join(homePath, ".gnupg"),
    path.join(homePath, ".aws"),
    path.join(homePath, ".kube"),
    path.join(homePath, ".docker"),
    path.join(homePath, ".git")
  ];

  for (const p of sensitivePaths) {
    if (realResolved.startsWith(p)) return true;
  }

  // Also deny specific browser profile configuration directories
  // NOTE: Browser cache directories (e.g., ~/.cache/google-chrome/Default/Cache) are fine
  // but config directories which contain user data (cookies, passwords) are NOT.
  const browserProfileConfigs = [
    path.join(homePath, ".config", "google-chrome"),
    path.join(homePath, ".config", "BraveSoftware"),
    path.join(homePath, ".mozilla", "firefox")
  ];

  for (const p of browserProfileConfigs) {
    if (realResolved.startsWith(p)) {
      // Allow specific cache subdirectories within browser profiles
      if (
        realResolved.includes(path.join("Default", "Cache")) ||
        realResolved.includes(path.join("Default", "Code Cache")) ||
        realResolved.includes(path.join("Default", "GPUCache")) ||
        realResolved.includes("ShaderCache") ||
        realResolved.includes("Cache")
      ) {
        // These are actual caches, allowed if part of a browser profile path
        continue;
      }
      return true; // Block other parts of browser profiles
    }
  }

  return false;
}

// ponytail: global lock, per-account locks if throughput matters
// This function needs the fs and path imports as well as the imports from detector and config

/**
 * Remove a directory safely
 * @param {string} dirPath - Directory path to remove
 * @returns {object} Result with success status and bytes freed
 */
export function removeDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, path: dirPath, error: "not found", bytesFreed: 0 };
    }

    if (isUnsafeDeletionTarget(dirPath)) {
      return { success: false, path: dirPath, error: "unsafe target", bytesFreed: 0 };
    }

    // Get size before deletion
    const bytes = getDirSize(dirPath);

    // Delete recursively
    fs.rmSync(dirPath, { recursive: true, force: true });

    return {
      success: true,
      path: dirPath,
      bytesFreed: bytes,
      freedFormatted: formatSize(bytes)
    };
  } catch (error) {
    return {
      success: false,
      path: dirPath,
      error: error.message,
      bytesFreed: 0
    };
  }
}

/**
 * Clean a single cache entry
 * @param {object} cacheEntry - Cache entry
 * @returns {object} Cleaning results
 */
export function cleanCacheEntry(cacheEntry) {
  const results = {
    name: cacheEntry.name,
    category: cacheEntry.category,
    paths: [],
    totalBytesFreed: 0,
    errors: []
  };

  const uniquePaths = [...new Set(cacheEntry.paths)];

  for (const p of uniquePaths) {
    if (!fs.existsSync(p)) continue;

    const result = removeDirectory(p);
    if (result.success) {
      results.paths.push(p);
      results.totalBytesFreed += result.bytesFreed;
    } else if (result.error !== "not found") {
      results.errors.push({ path: p, error: result.error });
    }
  }

  results.totalBytesFreedFormatted = formatSize(results.totalBytesFreed);
  return results;
}

/**
 * Clean all caches in a category
 * @param {object} cacheMap - Cache map object
 * @param {string} category - Category to clean
 * @param {boolean} deep - Include protected caches
 * @returns {object} Clean results
 */
export function cleanCategory(cacheMap, category, deep = false) {
  const caches = getCategoryCaches(cacheMap, category);
  const results = {
    category,
    entries: [],
    totalBytesFreed: 0,
    hasErrors: false
  };

  for (const [name, config] of Object.entries(caches)) {
    const entry = {
      ...config,
      name,
      category
    };

    // Skip if protected and not deep mode
    if (!shouldCleanCache(entry, deep)) {
      continue;
    }

    const scanResult = scanCacheEntry(entry);
    if (!scanResult.exists) continue;

    const cleanResult = cleanCacheEntry(entry);
    results.entries.push(cleanResult);
    results.totalBytesFreed += cleanResult.totalBytesFreed;

    if (cleanResult.errors.length > 0) {
      results.hasErrors = true;
    }
  }

  results.totalBytesFreedFormatted = formatSize(results.totalBytesFreed);
  return results;
}

/**
 * Clean all categories
 * @param {object} cacheMap - Cache map object
 * @param {boolean} deep - Include protected caches
 * @returns {object} All clean results
 */
export function cleanAll(cacheMap, deep = false) {
  const results = {
    categories: {},
    totalBytesFreed: 0,
    hasErrors: false,
    errors: []
  };

  for (const category of Object.values(CATEGORIES)) {
    const categoryResult = cleanCategory(cacheMap, category, deep);
    results.categories[category] = categoryResult;
    results.totalBytesFreed += categoryResult.totalBytesFreed;

    if (categoryResult.hasErrors) {
      results.hasErrors = true;
    }
  }

  results.totalBytesFreedFormatted = formatSize(results.totalBytesFreed);
  return results;
}

/**
 * Clean specific categories or all
 * @param {object} cacheMap - Cache map
 * @param {string|string[]} targets - Category, array of categories, or "all"
 * @param {boolean} deep - Include protected caches
 * @returns {object} Clean results
 */
export function clean(cacheMap, targets, deep = false) {
  if (targets === "all") {
    return cleanAll(cacheMap, deep);
  }

  const targetList = Array.isArray(targets) ? targets : [targets];

  const results = {
    categories: {},
    totalBytesFreed: 0,
    hasErrors: false
  };

  for (const target of targetList) {
    if (!Object.values(CATEGORIES).includes(target)) {
      continue;
    }

    const categoryResult = cleanCategory(cacheMap, target, deep);
    results.categories[target] = categoryResult;
    results.totalBytesFreed += categoryResult.totalBytesFreed;

    if (categoryResult.hasErrors) {
      results.hasErrors = true;
    }
  }

  results.totalBytesFreedFormatted = formatSize(results.totalBytesFreed);
  return results;
}

export default {
  removeDirectory,
  cleanCacheEntry,
  cleanCategory,
  cleanAll,
  clean
};