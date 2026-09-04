/**
 * Platform Abstraction Module
 * Defines cache locations and platform-specific behaviors
 */

import path from "path";
import { PLATFORMS } from "./detector.js";

// On Windows, the cache map must use Windows-style paths even when the
// process is running on POSIX (CI, dev, tests). path.win32 keeps the
// backslashes; path.join alone mixes separators on POSIX runners.
const win32 = path.win32;

/**
 * Cache categories
 */
export const CATEGORIES = {
  PACKAGE: "package",
  WEB: "web",
  BUILD: "build",
  SYSTEM: "system"
};

/**
 * Protection levels
 */
export const PROTECTION = {
  SAFE: "safe",
  PROTECTED: "protected"
};

/**
 * Get cache map for Linux
 * @param {string} home - User home directory
 * @param {string} cacheDir - XDG cache home
 * @param {string} dataDir - XDG data home
 * @returns {object} Cache map organized by category
 */
function getLinuxCacheMap(home, cacheDir, dataDir) {
  return {
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
    [CATEGORIES.WEB]: {
      chrome: {
        paths: [
          path.join(cacheDir, "google-chrome"),
          path.join(home, ".config", "google-chrome", "Default", "Cache"),
          path.join(home, ".config", "google-chrome", "Default", "Code Cache"),
          path.join(home, ".config", "google-chrome", "Default", "GPUCache"),
          path.join(home, ".config", "google-chrome", "ShaderCache")
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
 * Get cache map for macOS
 * NOTE: macOS currently reuses the Linux cache layout. macOS-specific paths
 * (e.g. ~/Library/Caches) are tracked for a future revision. Keeping this as
 * a named function — rather than inlining getLinuxCacheMap in the switch —
 * so the place-holder is easy to find and replace.
 * @param {string} home - User home directory
 * @param {string} cacheDir - Cache directory (~/Library/Caches on macOS)
 * @param {string} dataDir - Data directory (~/Library/Application Support on macOS)
 * @returns {object} Cache map organized by category
 */
function getMacOSCacheMap(home, cacheDir, dataDir) {
  return getLinuxCacheMap(home, cacheDir, dataDir);
}

/**
 * Get cache map for Windows
 * @param {string} home - User home (e.g. C:\Users\<user>)
 * @param {string} cacheDir - %LocalAppData% (e.g. C:\Users\<user>\AppData\Local)
 * @param {string} dataDir - %LocalAppData% (same as cacheDir on Windows)
 * @returns {object} Cache map organized by category
 */
function getWindowsCacheMap(home, cacheDir, dataDir) {
  // Roaming AppData is a separate location on Windows; rebuild it from home.
  // Use win32.join so backslashes survive even on POSIX CI/dev machines.
  const roamingDir = win32.join(home, "AppData", "Roaming");
  return {
    [CATEGORIES.PACKAGE]: {
      npm: {
        paths: [
          win32.join(cacheDir, "npm-cache"),
          win32.join(roamingDir, "npm")
        ],
        protection: PROTECTION.SAFE,
        description: "Node Package Manager"
      },
      yarn: {
        paths: [
          win32.join(cacheDir, "Yarn", "Cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Yarn Package Manager"
      },
      pnpm: {
        paths: [
          win32.join(cacheDir, "pnpm-cache")
        ],
        protection: PROTECTION.SAFE,
        description: "PNPM Package Manager"
      },
      pip: {
        paths: [
          win32.join(cacheDir, "pip", "Cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Python Package Manager"
      },
      uv: {
        paths: [
          win32.join(cacheDir, "uv")
        ],
        protection: PROTECTION.SAFE,
        description: "UV Python Package Manager"
      },
      cargo: {
        paths: [
          win32.join(home, ".cargo", "registry", "cache"),
          win32.join(home, ".cargo", "crates")
        ],
        protection: PROTECTION.SAFE,
        description: "Rust Cargo"
      },
      go: {
        paths: [
          win32.join(home, "go", "pkg", "mod", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Go Modules"
      },
      composer: {
        paths: [
          win32.join(home, ".composer", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "PHP Composer"
      },
      gem: {
        paths: [
          win32.join(home, ".gem")
        ],
        protection: PROTECTION.SAFE,
        description: "Ruby Gems"
      }
    },
    [CATEGORIES.WEB]: {
      chrome: {
        paths: [
          win32.join(cacheDir, "Google", "Chrome", "User Data", "Default", "Cache"),
          win32.join(cacheDir, "Google", "Chrome", "User Data", "Default", "Code Cache"),
          win32.join(cacheDir, "Google", "Chrome", "User Data", "Default", "GPUCache"),
          win32.join(cacheDir, "Google", "Chrome", "User Data", "ShaderCache")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Google Chrome"
      },
      brave: {
        paths: [
          win32.join(cacheDir, "BraveSoftware", "Brave-Browser", "User Data", "Default", "Cache")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Brave Browser"
      },
      firefox: {
        paths: [
          win32.join(cacheDir, "Mozilla", "Firefox", "Profiles"),
          win32.join(cacheDir, "mozilla", "firefox")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Mozilla Firefox"
      },
      edge: {
        paths: [
          win32.join(cacheDir, "Microsoft", "Edge", "User Data", "Default", "Cache")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Microsoft Edge"
      },
      chromium: {
        paths: [
          win32.join(cacheDir, "Chromium", "User Data", "Default", "Cache")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Chromium Browser"
      }
    },
    [CATEGORIES.BUILD]: {
      gradle: {
        paths: [
          win32.join(home, ".gradle", "caches")
        ],
        protection: PROTECTION.SAFE,
        description: "Gradle Build Tool"
      },
      maven: {
        paths: [
          win32.join(home, ".m2", "repository")
        ],
        protection: PROTECTION.SAFE,
        description: "Maven Repository"
      },
      webpack: {
        paths: [
          win32.join(cacheDir, "webpack")
        ],
        protection: PROTECTION.SAFE,
        description: "Webpack"
      },
      vite: {
        paths: [
          win32.join(cacheDir, "vite")
        ],
        protection: PROTECTION.SAFE,
        description: "Vite"
      },
      nextjs: {
        paths: [
          win32.join(home, ".next", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Next.js"
      },
      turborepo: {
        paths: [
          win32.join(home, ".turbo")
        ],
        protection: PROTECTION.SAFE,
        description: "Turborepo"
      },
      parcel: {
        paths: [
          win32.join(cacheDir, "Parcel", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Parcel Bundler"
      },
      node_gyp: {
        paths: [
          win32.join(cacheDir, "node-gyp")
        ],
        protection: PROTECTION.SAFE,
        description: "Node.js native addons"
      }
    },
    [CATEGORIES.SYSTEM]: {
      thumbnail: {
        paths: [
          win32.join(cacheDir, "Microsoft", "Windows", "Explorer")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Thumbnail cache"
      },
      // No direct Windows equivalent for the Linux file indexer (tracker3/tracker).
      // Keeping the entry with an empty path list preserves the category shape.
      tracker: {
        paths: [],
        protection: PROTECTION.PROTECTED,
        description: "File indexer (no Windows equivalent)"
      },
      trash: {
        paths: [
          win32.join(home, "$Recycle.Bin")
        ],
        protection: PROTECTION.PROTECTED,
        description: "Recycle Bin"
      },
      fontconfig: {
        paths: [
          win32.join(cacheDir, "fontconfig", "cache")
        ],
        protection: PROTECTION.SAFE,
        description: "Font config cache"
      },
      icu: {
        paths: [
          win32.join(cacheDir, "icu")
        ],
        protection: PROTECTION.SAFE,
        description: "ICU data cache"
      },
      shader: {
        paths: [
          win32.join(cacheDir, "mesa_shader_cache_db"),
          win32.join(cacheDir, "NVIDIA", "DXCache")
        ],
        protection: PROTECTION.PROTECTED,
        description: "GPU shader cache"
      }
    }
  };
}

/**
 * Get cache map for the given platform
 * @param {string} platform - One of PLATFORMS values
 * @param {string} home - User home directory
 * @param {string} cacheDir - Platform-specific cache directory
 * @param {string} dataDir - Platform-specific data directory
 * @returns {object} Cache map organized by category
 * @throws {Error} If platform is not recognized
 */
export function getCacheMapForPlatform(platform, home, cacheDir, dataDir) {
  switch (platform) {
    case PLATFORMS.LINUX:
      return getLinuxCacheMap(home, cacheDir, dataDir);
    case PLATFORMS.MACOS:
      return getMacOSCacheMap(home, cacheDir, dataDir);
    case PLATFORMS.WINDOWS:
      return getWindowsCacheMap(home, cacheDir, dataDir);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
