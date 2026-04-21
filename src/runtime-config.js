/**
 * Runtime Config Utilities
 * Applies config-driven behavior for CLI operations.
 */

import { CATEGORIES } from "./cache-map.js";

function normalizeCategoryList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((category) => Object.values(CATEGORIES).includes(category))
    .filter((category, index, array) => array.indexOf(category) === index);
}

export function getProtectedCategories(config = {}) {
  return normalizeCategoryList(config.protected);
}

export function getAlwaysCleanCategories(config = {}) {
  return normalizeCategoryList(config.alwaysClean);
}

export function isCategoryProtected(category, config = {}) {
  return getProtectedCategories(config).includes(category);
}

export function getEffectiveMinThreshold(config = {}) {
  const rawValue = Number(config.minThreshold);
  if (!Number.isFinite(rawValue) || rawValue < 0) {
    return 0;
  }

  return Math.floor(rawValue);
}

export function isBelowMinThreshold(totalBytes, config = {}) {
  const threshold = getEffectiveMinThreshold(config);
  return threshold > 0 && totalBytes < threshold;
}

export function isDeepEnabledForCategory(category, opts = {}, config = {}) {
  if (isCategoryProtected(category, config)) {
    return false;
  }

  if (opts.deep === true) {
    return true;
  }

  if (config.deepClean?.all === true) {
    return true;
  }

  if (config.deepClean?.[category] === true) {
    return true;
  }

  return getAlwaysCleanCategories(config).includes(category);
}

export function getConfigCleanableCategories(config = {}) {
  const protectedCategories = new Set(getProtectedCategories(config));

  return Object.values(CATEGORIES).filter((category) => !protectedCategories.has(category));
}

export default {
  getProtectedCategories,
  getAlwaysCleanCategories,
  isCategoryProtected,
  getEffectiveMinThreshold,
  isBelowMinThreshold,
  isDeepEnabledForCategory,
  getConfigCleanableCategories
};
