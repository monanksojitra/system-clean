/**
 * Cache Map Module
 * Defines all cache locations for different platforms and package managers
 */

import { CATEGORIES, PROTECTION, getCacheMapForPlatform } from "./platform.js";

// Re-export categories and protection from platform
export { CATEGORIES, PROTECTION };

/**
 * Get cache locations for the current platform
 * @param {object} systemInfo - System information from detector
 * @returns {object} Cache map organized by category
 */
export function getCacheMap(systemInfo) {
  const { platform, homedir, cachedir, datadir } = systemInfo;
  return getCacheMapForPlatform(platform, homedir, cachedir, datadir);
}

/**
 * Flatten cache map to a simple key-value object
 * @param {object} cacheMap - Cache map from getCacheMap
 * @returns {object} Flattened cache entries
 */
export function flattenCacheMap(cacheMap) {
  const flat = {};

  for (const category of Object.values(CATEGORIES)) {
    const categoryCaches = cacheMap[category];
    if (!categoryCaches) continue;

    for (const [name, config] of Object.entries(categoryCaches)) {
      flat[`${category}.${name}`] = {
        ...config,
        category,
        name
      };
    }
  }

  return flat;
}

/**
 * Get all cache entries for a specific category
 * @param {object} cacheMap - Cache map
 * @param {string} category - Category from CATEGORIES
 * @returns {object} Cache entries for that category
 */
export function getCategoryCaches(cacheMap, category) {
  return cacheMap[category] || {};
}

/**
 * Check if a cache entry should be cleaned based on deep mode
 * @param {object} cacheEntry - Cache entry from flattenCacheMap
 * @param {boolean} deep - Whether --deep flag is set
 * @returns {boolean} Whether to clean
 */
export function shouldCleanCache(cacheEntry, deep) {
  if (cacheEntry.protection === PROTECTION.SAFE) {
    return true;
  }

  if (cacheEntry.protection === PROTECTION.PROTECTED && deep) {
    return true;
  }

  return false;
}
