/**
 * System Clean - Main Module
 * Cross-platform cache cleaner for developers
 */

import {
  detectPlatform,
  getSystemInfo,
  getHomeDir,
  getCacheDir,
  PLATFORMS
} from "./detector.js";
import { getCacheMap, CATEGORIES, PROTECTION } from "./cache-map.js";
import { scanAll, scanCategory, quickScan as quickScanBytes, formatSize } from "./scanner.js";
import { clean, cleanCategory, cleanAll } from "./cleaner.js";
import { loadConfig, saveConfig, resetConfig } from "./config.js";

export { detectPlatform, getSystemInfo, getHomeDir, getCacheDir, PLATFORMS };
export { getCacheMap, CATEGORIES, PROTECTION };
export { scanAll, scanCategory, quickScanBytes, formatSize };
export { clean, cleanCategory, cleanAll };
export { loadConfig, saveConfig, resetConfig };
export * as logger from "./logger.js";

/**
 * Quick clean function
 * @param {string|string[]} targets - Categories to clean
 * @param {object} options - Options { deep, force }
 * @returns {object} Clean results
 */
export async function quickClean(targets = "all", options = {}) {
  const { getSystemInfo } = await import("./detector.js");
  const { getCacheMap } = await import("./cache-map.js");
  const { clean } = await import("./cleaner.js");

  const sysInfo = getSystemInfo();
  const cacheMap = getCacheMap(sysInfo);

  return clean(cacheMap, targets, options.deep || false);
}

/**
 * Quick scan function
 * @param {object} options - Options { deep }
 * @returns {object} Scan results
 */
export async function quickScan(options = {}) {
  const { getSystemInfo } = await import("./detector.js");
  const { getCacheMap } = await import("./cache-map.js");
  const { scanAll } = await import("./scanner.js");

  const sysInfo = getSystemInfo();
  const cacheMap = getCacheMap(sysInfo);

  return scanAll(cacheMap, options.deep || false);
}

export default {
  detectPlatform,
  getSystemInfo,
  getCacheMap,
  scanAll,
  scanCategory,
  clean,
  cleanCategory,
  cleanAll,
  loadConfig,
  quickClean,
  quickScan
};