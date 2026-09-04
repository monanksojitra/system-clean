/**
 * OS Detector Module
 * Detects the current operating system and provides platform-specific utilities
 */

import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Supported operating systems
 */
export const PLATFORMS = {
  LINUX: "linux",
  MACOS: "macos",
  WINDOWS: "windows",
  UNKNOWN: "unknown"
};

/**
 * Linux distributions
 */
export const LINUX_DISTROS = {
  UBUNTU: "ubuntu",
  DEBIAN: "debian",
  FEDORA: "fedora",
  ARCH: "arch",
  MANJARO: "manjaro",
  ALPINE: "alpine",
  UNKNOWN: "unknown"
};

/**
 * Detect the current platform
 * @returns {string} Platform name from PLATFORMS
 */
export function detectPlatform() {
  const platform = os.platform();

  switch (platform) {
    case "linux":
      return PLATFORMS.LINUX;
    case "darwin":
      return PLATFORMS.MACOS;
    case "win32":
      return PLATFORMS.WINDOWS;
    default:
      return PLATFORMS.UNKNOWN;
  }
}

/**
 * Detect Linux distribution
 * @returns {string} Distribution name from LINUX_DISTROS
 */
export function detectLinuxDistro() {
  try {
    // Check /etc/os-release first (most reliable)
    if (fs.existsSync("/etc/os-release")) {
      const content = fs.readFileSync("/etc/os-release", "utf8");
      const lines = content.split("\n");

      for (const line of lines) {
        if (line.startsWith("ID=")) {
          const distro = line.replace("ID=", "").replace(/"/g, "").trim().toLowerCase();

          if (distro.includes("ubuntu")) return LINUX_DISTROS.UBUNTU;
          if (distro.includes("debian")) return LINUX_DISTROS.DEBIAN;
          if (distro.includes("fedora")) return LINUX_DISTROS.FEDORA;
          if (distro.includes("arch")) return LINUX_DISTROS.ARCH;
          if (distro.includes("manjaro")) return LINUX_DISTROS.MANJARO;
          if (distro.includes("alpine")) return LINUX_DISTROS.ALPINE;
        }
      }
    }

    // Fallback: check lsb-release
    if (fs.existsSync("/etc/lsb-release")) {
      const content = fs.readFileSync("/etc/lsb-release", "utf8");
      if (content.includes("Ubuntu")) return LINUX_DISTROS.UBUNTU;
      if (content.includes("Debian")) return LINUX_DISTROS.DEBIAN;
      if (content.includes("Fedora")) return LINUX_DISTROS.FEDORA;
    }

    // Note: a bare /etc/machine-id does NOT mean Ubuntu — it just means
    // systemd. The previous version defaulted to UBUNTU here, which was
    // wrong for Arch, Fedora, openSUSE, etc. If we get this far without
    // a match, we genuinely don't know the distro.
  } catch {
    // Silently fail and return unknown
  }

  return LINUX_DISTROS.UNKNOWN;
}

/**
 * Get user home directory
 * @returns {string} Home directory path
 */
export function getHomeDir() {
  return os.homedir();
}

/**
 * Get temp directory
 * @returns {string} Temp directory path
 */
export function getTempDir() {
  return os.tmpdir();
}

/**
 * Get config directory (platform-specific)
 * @returns {string} Config directory path
 */
export function getConfigDir() {
  const home = getHomeDir();
  const platform = detectPlatform();
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;

  switch (platform) {
    case PLATFORMS.LINUX:
      return xdgConfigHome || path.join(home, ".config");
    case PLATFORMS.MACOS:
      if (xdgConfigHome) return xdgConfigHome;
      return path.join(home, "Library", "Application Support");
    case PLATFORMS.WINDOWS:
      return process.env.APPDATA || path.join(home, "AppData", "Roaming");
    default:
      return path.join(home, ".config");
  }
}

/**
 * Get cache directory (platform-specific)
 * @returns {string} Cache directory path
 */
export function getCacheDir() {
  const home = getHomeDir();
  const platform = detectPlatform();

  switch (platform) {
    case PLATFORMS.LINUX:
    case PLATFORMS.MACOS:
      return process.env.XDG_CACHE_HOME || path.join(home, ".cache");
    case PLATFORMS.WINDOWS:
      return process.env.LOCALAPPDATA || path.join(home, "AppData", "Local", "Temp");
    default:
      return path.join(home, ".cache");
  }
}

/**
 * Get data directory (platform-specific)
 * @returns {string} Data directory path
 */
export function getDataDir() {
  const home = getHomeDir();
  const platform = detectPlatform();

  switch (platform) {
    case PLATFORMS.LINUX:
      return process.env.XDG_DATA_HOME || path.join(home, ".local", "share");
    case PLATFORMS.MACOS:
      return path.join(home, "Library", "Application Support");
    case PLATFORMS.WINDOWS:
      return process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    default:
      return path.join(home, ".local", "share");
  }
}

/**
 * Get system info object
 * @returns {object} System information
 */
export function getSystemInfo() {
  const platform = detectPlatform();
  const distro = platform === PLATFORMS.LINUX ? detectLinuxDistro() : null;

  return {
    platform,
    distro,
    os: os.type(),
    release: os.release(),
    arch: os.arch(),
    homedir: getHomeDir(),
    tmpdir: getTempDir(),
    cachedir: getCacheDir(),
    configdir: getConfigDir(),
    datadir: getDataDir()
  };
}

/**
 * Check if running with elevated privileges
 * @returns {boolean} True if root/admin
 */
export function isElevated() {
  // POSIX (Linux/macOS): process.getuid is the canonical root check.
  if (process.platform !== "win32") {
    return typeof process.getuid === "function" && process.getuid() === 0;
  }

  // Windows: process.getuid is undefined, so the previous implementation
  // always returned false here — which silently let admin users run the
  // cleaner and risk destroying system files. Probe write access to
  // System32: admins can write, non-admins cannot.
  try {
    const sys32 = path.join(
      process.env.SystemRoot || "C:\\Windows",
      "System32"
    );
    fs.accessSync(sys32, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export default {
  PLATFORMS,
  LINUX_DISTROS,
  detectPlatform,
  detectLinuxDistro,
  getHomeDir,
  getTempDir,
  getConfigDir,
  getCacheDir,
  getDataDir,
  getSystemInfo,
  isElevated
};
