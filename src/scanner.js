/**
 * Scanner Module
 * Scans and calculates cache sizes
 */

import fs from "fs";
import { execFileSync } from "child_process";
import { CATEGORIES, getCategoryCaches, shouldCleanCache } from "./cache-map.js";

/**
 * Parse size string (e.g., "1.5GB") to bytes
 * @param {string} size - Size string
 * @returns {number} Size in bytes
 */
export function parseSize(size) {
  if (typeof size === "number") return size;

  const match = String(size).match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();

  const multipliers = {
    "B": 1,
    "KB": 1024,
    "MB": 1024 ** 2,
    "GB": 1024 ** 3,
    "TB": 1024 ** 4
  };

  return value * (multipliers[unit] || 1);
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatSize(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Get size of a directory in bytes
 * Uses du command for accuracy and speed
 * @param {string} dirPath - Directory path
 * @returns {number} Size in bytes, 0 if not found
 */
export function getDirSize(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;

    // GNU coreutils (Linux): byte-accurate output.
    const bytesOutput = execFileSync("du", ["-sb", dirPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });

    const byteSize = parseInt(bytesOutput.trim().split(/\s+/)[0], 10);
    if (!isNaN(byteSize)) {
      return byteSize;
    }
  } catch {
    // Fall through to BSD/macOS-compatible mode.
  }

  try {
    // BSD/macOS: size in KiB, converted to bytes.
    const kbOutput = execFileSync("du", ["-sk", dirPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });

    const kbSize = parseInt(kbOutput.trim().split(/\s+/)[0], 10);
    return isNaN(kbSize) ? 0 : kbSize * 1024;
  } catch {
    return 0;
  }
}

/**
 * Scan a single cache entry
 * @param {object} cacheEntry - Cache entry from flattenCacheMap
 * @returns {object} Scan result with size and exists status
 */
export function scanCacheEntry(cacheEntry) {
  let totalSize = 0;
  const uniquePaths = [...new Set(cacheEntry.paths)];
  const existingPaths = [];

  for (const p of uniquePaths) {
    if (fs.existsSync(p)) {
      totalSize += getDirSize(p);
      existingPaths.push(p);
    }
  }

  return {
    name: cacheEntry.name,
    category: cacheEntry.category,
    paths: uniquePaths,
    description: cacheEntry.description,
    protection: cacheEntry.protection,
    exists: existingPaths.length > 0,
    size: totalSize,
    sizeFormatted: formatSize(totalSize),
    existingPaths
  };
}

/**
 * Scan all caches for a category
 * @param {object} cacheMap - Cache map object
 * @param {string} category - Category to scan
 * @param {boolean} deep - Whether to include protected caches
 * @returns {object} Scan results
 */
export function scanCategory(cacheMap, category, deep = false) {
  const caches = getCategoryCaches(cacheMap, category);
  const results = {
    category,
    totalSize: 0,
    entries: []
  };

  for (const [name, config] of Object.entries(caches)) {
    const entry = {
      ...config,
      name,
      category
    };

    if (!shouldCleanCache(entry, deep)) {
      continue;
    }

    const scanResult = scanCacheEntry({ ...entry, name });
    if (scanResult.size > 0) {
      results.entries.push(scanResult);
      results.totalSize += scanResult.size;
    }
  }

  results.totalSizeFormatted = formatSize(results.totalSize);
  return results;
}

/**
 * Scan all categories
 * @param {object} cacheMap - Cache map object
 * @param {boolean} deep - Whether to include protected caches
 * @returns {object} All scan results
 */
export function scanAll(cacheMap, deep = false) {
  const results = {
    categories: {},
    totalSize: 0,
    summary: {}
  };

  for (const category of Object.values(CATEGORIES)) {
    const categoryResult = scanCategory(cacheMap, category, deep);
    results.categories[category] = categoryResult;
    results.totalSize += categoryResult.totalSize;

    if (categoryResult.entries.length > 0) {
      results.summary[category] = {
        size: categoryResult.totalSize,
        count: categoryResult.entries.length
      };
    }
  }

  results.totalSizeFormatted = formatSize(results.totalSize);
  return results;
}

/**
 * Quick scan - get total cleanable size without details
 * @param {object} cacheMap - Cache map object
 * @param {boolean} deep - Include protected
 * @returns {number} Total bytes
 */
export function quickScan(cacheMap, deep = false) {
  let total = 0;

  for (const category of Object.values(CATEGORIES)) {
    const result = scanCategory(cacheMap, category, deep);
    total += result.totalSize;
  }

  return total;
}

/**
 * Get scan results formatted for table display
 * @param {object} scanResults - Results from scanAll
 * @returns {array} Rows for table display
 */
export function formatScanTable(scanResults) {
  const rows = [];

  for (const [category, result] of Object.entries(scanResults.categories)) {
    if (result.entries.length === 0) continue;

    for (const entry of result.entries) {
      rows.push({
        category,
        name: entry.name,
        size: entry.sizeFormatted,
        description: entry.description,
        protection: entry.protection
      });
    }
  }

  return rows;
}

export default {
  parseSize,
  formatSize,
  getDirSize,
  scanCacheEntry,
  scanCategory,
  scanAll,
  quickScan,
  formatScanTable
};