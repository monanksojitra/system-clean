/**
 * Config Module
 * Manages user configuration and protected caches
 */

import fs from "fs";
import path from "path";
import { getConfigDir } from "./detector.js";

const CONFIG_FILENAME = "system-clean.json";

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  version: "1.0.0",
  protected: [],  // Categories to always protect
  alwaysClean: ["package"], // Categories to always clean without --deep
  deepClean: {
    all: false,
    web: false,
    system: false
  },
  confirmAll: true,
  minThreshold: 0,  // Minimum bytes to clean (0 = no minimum)
  logFile: null,
  color: true,
  tableStyle: "default"
};

/**
 * Get config directory path
 * @returns {string} Config directory path
 */
export function getConfigPath() {
  return path.join(getConfigDir(), "system-clean");
}

/**
 * Get full config file path
 * @returns {string} Config file path
 */
export function getConfigFile() {
  return path.join(getConfigPath(), CONFIG_FILENAME);
}

/**
 * Check if config exists
 * @returns {boolean} True if config file exists
 */
export function configExists() {
  return fs.existsSync(getConfigFile());
}

/**
 * Load config from file
 * @returns {object} Configuration object
 */
export function loadConfig() {
  const configFile = getConfigFile();

  if (!fs.existsSync(configFile)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = fs.readFileSync(configFile, "utf8");
    const userConfig = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save config to file
 * @param {object} config - Configuration object to save
 */
export function saveConfig(config) {
  const configDir = getConfigPath();
  const configFile = getConfigFile();

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Merge with defaults to ensure all keys exist
  const merged = { ...DEFAULT_CONFIG, ...config };

  fs.writeFileSync(configFile, JSON.stringify(merged, null, 2));
}

/**
 * Update specific config values
 * @param {object} updates - Object with updates
 * @returns {object} Updated config
 */
export function updateConfig(updates) {
  const current = loadConfig();
  const updated = { ...current, ...updates };
  saveConfig(updated);
  return updated;
}

/**
 * Reset config to defaults
 * @returns {object} Default config
 */
export function resetConfig() {
  saveConfig(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
}

/**
 * Add a category to protected list
 * @param {string} category - Category to protect
 * @returns {object} Updated config
 */
export function protectCategory(category) {
  const config = loadConfig();
  if (!config.protected.includes(category)) {
    config.protected.push(category);
    saveConfig(config);
  }
  return config;
}

/**
 * Remove a category from protected list
 * @param {string} category - Category to unprotect
 * @returns {object} Updated config
 */
export function unprotectCategory(category) {
  const config = loadConfig();
  config.protected = config.protected.filter(c => c !== category);
  saveConfig(config);
  return config;
}

/**
 * Check if a category is protected
 * @param {string} category - Category to check
 * @returns {boolean} True if protected
 */
export function isProtected(category) {
  const config = loadConfig();
  return config.protected.includes(category);
}

export default {
  DEFAULT_CONFIG,
  getConfigPath,
  getConfigFile,
  configExists,
  loadConfig,
  saveConfig,
  updateConfig,
  resetConfig,
  protectCategory,
  unprotectCategory,
  isProtected
};