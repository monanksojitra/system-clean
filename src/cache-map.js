/**
 * Cache Map Module
 * Defines all cache locations for different platforms and package managers
 */

import path from "path";
import { PLATFORMS } from "./detector.js";

/**
 * Cache categories
 */
export const CATEGORIES = {
  PACKAGE: "package",     // npm, yarn, pip, etc.
  WEB: "web",          // Browser caches
  BUILD: "build",       // Build tool caches
  SYSTEM: "system"      // OS temp files
};

/**
 * Protection levels
 */
export const PROTECTION = {
  SAFE: "safe",        // Can be cleaned without --deep
  PROTECTED: "protected", // Require --deep flag
  SYSTEM: "system"     // Danger, requires elevated privileges
};

/**
 * Get cache locations for the current platform
 * @param {object} systemInfo - System information from detector
 * @returns {object} Cache map organized by category
 */
export function getCacheMap(systemInfo) {
  const platform = systemInfo.platform;
  const home = systemInfo.homedir;

  // Common base paths
  const cacheDir = systemInfo.cachedir;
  const dataDir = systemInfo.datadir;

  if (platform === PLATFORMS.LINUX || platform === PLATFORMS.MACOS) {
    return getUnixCacheMap(home, cacheDir, dataDir);
  }

  // Fallback to Linux-style paths
  return getUnixCacheMap(home, cacheDir, dataDir);
}

/**
 * Get Unix (Linux/macOS) cache map
 */
function getUnixCacheMap(home, cacheDir, dataDir) {
  return {
    // Package managers
    [CATEGORIES.PACKAGE]: {
      npm: {
        paths: [
          path.join(home, ".npm"),
          path.join(home, ".npm-global")
        ],
        protection: PROTECTION.SAFE,
        description: "Node Package Manager"
      },
      yarn: {
        paths: [
          path.join(cacheDir, "yarn")
        ],
        protection: PROTECTION.SAFE,
        description: "Yarn Package Manager"
      },
      pnpm: {
        paths: [
          path.join(cacheDir, "pnpm")
        ],
        protection: PROTECTION.SAFE,
        description: "PNPM Package Manager"
      },
      pip: {
        paths: [
          path.join(cacheDir, "pip")
        ],
        protection: PROTECTION.SAFE,
        description: "Python Package Manager"
      },
      uv: {
        paths: [
          path.join(cacheDir, "uv")
        ],
        protection: PROTECTION.SAFE,
        description: "UV Python Package Manager"
      },
      cargo: {
        paths: [
          path.join(home, ".cargo", "crates"),
          path.join(home, ".cargo", "registry", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Rust Cargo"
      },
      go: {
        paths: [
          path.join(home, "go", "pkg", "mod", "cache"),
          path.join(home, "go", "pkg", "mod")
        ],
        protection: PROTECTION.SAFE,
        description: "Go Modules"
      },
      composer: {
        paths: [
          path.join(home, ".composer", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "PHP Composer"
      },
      gem: {
        paths: [
          path.join(home, ".gem", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Ruby Gems"
      }
    },

    // Web browsers
    [CATEGORIES.WEB]: {
      chrome: {
        paths: [
          path.join(cacheDir, "google-chrome"),
          path.join(home, ".config", "google-chrome")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Google Chrome"
      },
      brave: {
        paths: [
          path.join(cacheDir, "BraveSoftware")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Brave Browser"
      },
      firefox: {
        paths: [
          path.join(cacheDir, "mozilla"),
          path.join(home, ".cache", "firefox")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Mozilla Firefox"
      },
      edge: {
        paths: [
          path.join(cacheDir, "Microsoft", "Edge")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Microsoft Edge"
      },
      chromium: {
        paths: [
          path.join(cacheDir, "chromium")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Chromium Browser"
      }
    },

    // Build tools
    [CATEGORIES.BUILD]: {
      gradle: {
        paths: [
          path.join(home, ".gradle", "caches"),
          path.join(cacheDir, "gradle")
        ],
        protection: PROTECTION.SAFE,
        description: "Gradle Build Tool"
      },
      maven: {
        paths: [
          path.join(home, ".m2", "repository")
        ],
        protection: PROTECTION.SAFE,
        description: "Maven Repository"
      },
      webpack: {
        paths: [
          path.join(cacheDir, "webpack"),
          path.join(home, ".cache", "webpack")
        ],
        protection: PROTECTION.SAFE,
        description: "Webpack"
      },
      vite: {
        paths: [
          path.join(cacheDir, "vite")
        ],
        protection: PROTECTION.SAFE,
        description: "Vite"
      },
      nextjs: {
        paths: [
          path.join(home, ".next", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Next.js"
      },
      turborepo: {
        paths: [
          path.join(home, ".turbo")
        ],
        protection: PROTECTION.SAFE,
        description: "Turborepo"
      },
      parcel: {
        paths: [
          path.join(cacheDir, "parcel-cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Parcel Bundler"
      },
      node_gyp: {
        paths: [
          path.join(cacheDir, "node-gyp")
        ],
        protection: PROTECTION.SAFE,
        description: "Node.js native addons"
      }
    },

    // System caches
    [CATEGORIES.SYSTEM]: {
      thumbnail: {
        paths: [
          path.join(cacheDir, "thumbnails")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Thumbnail cache"
      },
      tracker: {
        paths: [
          path.join(cacheDir, "tracker3"),
          path.join(cacheDir, "tracker")
        ],
        protection: PROTECTION.PROTECTED,
        description: "File indexer"
      },
      trash: {
        paths: [
          path.join(dataDir, "Trash"),
          path.join(home, ".local", "share", "Trash")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Trash bin"
      },
      fontconfig: {
        paths: [
          path.join(cacheDir, "fontconfig")
        ],
        protection: PROTECTION.SAFE,
        description: "Font config cache"
      },
      icu: {
        paths: [
          path.join(cacheDir, "icu")
        ],
        protection: PROTECTION.SAFE,
        description: "ICU data cache"
      },
      shader: {
        paths: [
          path.join(cacheDir, "mesa_shader_cache_db"),
          path.join(cacheDir, "shader")
        ],
        protection: PROTECTION.PROTECTED,
        description: "GPU shader cache"
      }
    }
  };
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

export default {
  CATEGORIES,
  PROTECTION,
  getCacheMap,
  flattenCacheMap,
  getCategoryCaches,
  shouldCleanCache
};