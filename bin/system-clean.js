#!/usr/bin/env node

/**
 * System Clean - Cross-Platform Cache Cleaner
 * Main CLI entry point
 */

import readline from "node:readline";
import { getSystemInfo, PLATFORMS } from "../src/detector.js";
import { getCacheMap, CATEGORIES } from "../src/cache-map.js";
import { scanCategory, formatSize } from "../src/scanner.js";
import { cleanCategory } from "../src/cleaner.js";
import { loadConfig, resetConfig } from "../src/config.js";
import {
  getProtectedCategories,
  isCategoryProtected,
  getEffectiveMinThreshold,
  isBelowMinThreshold,
  isDeepEnabledForCategory,
  getConfigCleanableCategories
} from "../src/runtime-config.js";
import * as logger from "../src/logger.js";

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const opts = parseOptions(args);

  // Show help
  if (opts.help) {
    logger.printHelp();
    return;
  }

  // Load config
  const config = loadConfig();
  logger.setColors(opts.json ? false : config.color !== false);

  // Get system info and cache map
  const sysInfo = getSystemInfo();
  const cacheMap = getCacheMap(sysInfo);

  // Check platform
  if (sysInfo.platform === PLATFORMS.WINDOWS && !opts.json) {
    logger.warning("Windows support is experimental");
  }

  // Handle commands
  if (opts.command === "scan") {
    return handleScan(cacheMap, opts, config, sysInfo);
  }

  if (opts.command === "clean") {
    return handleClean(cacheMap, opts, config);
  }

  if (opts.command === "clean-all") {
    return handleCleanAll(cacheMap, opts, config);
  }

  if (opts.command === "config") {
    return handleConfig(opts, config);
  }

  if (opts.command === "reset-config") {
    resetConfig();
    logger.success("Config reset to defaults");
    return;
  }

  // No command = show help
  logger.printHelp();
}

/**
 * Parse command line options
 */
function parseOptions(args) {
  const opts = {
    command: null,
    category: null,
    deep: false,
    force: false,
    simple: false,
    help: false,
    json: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg === "--scan" || arg === "--dry-run" || arg === "-s") {
      opts.command = "scan";
    } else if (arg === "--clean" || arg === "-c") {
      opts.command = "clean";
      opts.category = args[++i];
    } else if (arg === "--clean-all" || arg === "-a") {
      opts.command = "clean-all";
    } else if (arg === "--deep") {
      opts.deep = true;
    } else if (arg === "--force" || arg === "-f") {
      opts.force = true;
    } else if (arg === "--simple") {
      opts.simple = true;
    } else if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--config") {
      opts.command = "config";
    } else if (arg === "--reset-config") {
      opts.command = "reset-config";
    } else if (arg === "scan") {
      opts.command = "scan";
    } else if (arg === "clean") {
      opts.command = "clean";
      opts.category = args[++i];
    } else if (arg === "clean-all" || arg === "all") {
      opts.command = "clean-all";
    } else if (arg === "config") {
      opts.command = "config";
    } else if (arg === "help") {
      opts.help = true;
    }
  }

  return opts;
}

/**
 * Handle scan/dry-run
 */
function handleScan(cacheMap, opts, config = {}, sysInfo = getSystemInfo()) {
  const protectedCategories = getProtectedCategories(config);
  const cleanableCategories = new Set(getConfigCleanableCategories(config));
  const results = {
    categories: {},
    summary: {},
    totalSize: 0,
    totalSizeFormatted: "0 B"
  };

  for (const category of Object.values(CATEGORIES)) {
    if (!cleanableCategories.has(category)) {
      results.categories[category] = {
        category,
        totalSize: 0,
        totalSizeFormatted: "0 B",
        entries: []
      };
      continue;
    }

    const deep = isDeepEnabledForCategory(category, opts, config);
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

  if (opts.json) {
    printJson({
      ok: true,
      command: "scan",
      options: {
        deep: opts.deep,
        simple: opts.simple,
        json: true
      },
      system: {
        platform: sysInfo.platform,
        distro: sysInfo.distro,
        os: sysInfo.os,
        release: sysInfo.release,
        arch: sysInfo.arch
      },
      protectedCategories,
      results
    });
    return;
  }

  logger.banner("System Clean - Cache Scanner");
  logger.systemInfo(sysInfo);

  if (opts.simple) {
    logger.printSimpleSummary(results);
  } else {
    logger.printScanTable(results);
  }

  const totalLabel = opts.deep ? "Total (with --deep):" : "Total cleanable:";
  console.log(`\n${totalLabel} ${results.totalSizeFormatted}`);

  if (!opts.deep) {
    console.log(`\nNote: Use --deep to include protected caches`);
  }

  if (protectedCategories.length > 0) {
    console.log(`\nConfig protected categories: ${protectedCategories.join(", ")}`);
  }
}

/**
 * Handle clean specific category
 */
function handleClean(cacheMap, opts, config = {}) {
  const target = opts.category;
  const force = opts.force || config.confirmAll === false;
  const minThreshold = getEffectiveMinThreshold(config);

  if (!target) {
    if (opts.json) {
      printJson({
        ok: false,
        command: "clean",
        error: {
          code: "missing_category",
          message: "Please specify a category"
        },
        validCategories: Object.values(CATEGORIES)
      });
    } else {
      logger.error("Please specify a category");
      console.log(`\nValid categories: ${Object.values(CATEGORIES).join(", ")}`);
    }
    process.exit(1);
  }

  if (!Object.values(CATEGORIES).includes(target)) {
    if (opts.json) {
      printJson({
        ok: false,
        command: "clean",
        error: {
          code: "invalid_category",
          message: `Invalid category: ${target}`
        },
        validCategories: Object.values(CATEGORIES)
      });
    } else {
      logger.error(`Invalid category: ${target}`);
      console.log(`\nValid categories: ${Object.values(CATEGORIES).join(", ")}`);
    }
    process.exit(1);
  }

  if (isCategoryProtected(target, config)) {
    if (opts.json) {
      printJson({
        ok: true,
        command: "clean",
        status: "skipped",
        reason: "protected_category",
        category: target
      });
    } else {
      logger.warning(`Category '${target}' is protected in config and cannot be cleaned`);
    }
    return;
  }

  const deep = isDeepEnabledForCategory(target, opts, config);

  const scanResult = scanCategory(cacheMap, target, deep);

  if (scanResult.totalSize === 0) {
    if (opts.json) {
      printJson({
        ok: true,
        command: "clean",
        status: "skipped",
        reason: "no_caches_found",
        category: target,
        scanResult
      });
    } else {
      logger.info(`No caches found for category: ${target}`);
    }
    return;
  }

  if (isBelowMinThreshold(scanResult.totalSize, config)) {
    if (opts.json) {
      printJson({
        ok: true,
        command: "clean",
        status: "skipped",
        reason: "below_min_threshold",
        category: target,
        minThreshold,
        scanResult
      });
    } else {
      logger.info(
        `Skipping '${target}' because size (${scanResult.totalSizeFormatted}) is below minThreshold (${formatSize(minThreshold)})`
      );
    }
    return;
  }

  if (opts.json) {
    const result = cleanCategory(cacheMap, target, deep);
    printJson({
      ok: true,
      command: "clean",
      status: "cleaned",
      category: target,
      deep,
      result
    });
    return;
  }

  if (!force) {
    console.log(`\n${logger.color("Category:", "cyan")} ${target}`);
    console.log(`${logger.color("Size:", "cyan")} ${scanResult.totalSizeFormatted}`);
    console.log(`${logger.color("Entries:", "cyan")} ${scanResult.entries.length}`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`\n${logger.color("Clean these caches?", "yellow")} (y/N): `, (answer) => {
      rl.close();
      if (answer.toLowerCase() !== "y") {
        logger.warning("Cancelled");
        process.exit(0);
      }
      doClean();
    });
  } else {
    doClean();
  }

  function doClean() {
    logger.info("Cleaning...");
    const result = cleanCategory(cacheMap, target, deep);
    logger.printCleanResults({ categories: { [target]: result } });
  }
}

/**
 * Handle clean all
 */
function handleCleanAll(cacheMap, opts, config = {}) {
  const force = opts.force || config.confirmAll === false;
  const protectedCategories = getProtectedCategories(config);
  const cleanableCategories = getConfigCleanableCategories(config);
  const minThreshold = getEffectiveMinThreshold(config);
  const candidates = [];
  let totalBytes = 0;

  for (const category of cleanableCategories) {
    const deep = isDeepEnabledForCategory(category, opts, config);
    const scanResult = scanCategory(cacheMap, category, deep);

    if (scanResult.totalSize === 0) {
      continue;
    }

    if (isBelowMinThreshold(scanResult.totalSize, config)) {
      if (!opts.json) {
        logger.info(
          `Skipping '${category}' because size (${scanResult.totalSizeFormatted}) is below minThreshold (${formatSize(minThreshold)})`
        );
      }
      continue;
    }

    candidates.push({ category, deep });
    totalBytes += scanResult.totalSize;
  }

  if (candidates.length === 0) {
    if (opts.json) {
      printJson({
        ok: true,
        command: "clean-all",
        status: "no-op",
        reason: "no_candidates",
        protectedCategories,
        minThreshold
      });
    } else {
      logger.info("No caches matched current config rules for clean-all");
    }
    return;
  }

  if (opts.json) {
    const result = {
      categories: {},
      totalBytesFreed: 0,
      totalBytesFreedFormatted: "0 B",
      hasErrors: false
    };

    for (const item of candidates) {
      const categoryResult = cleanCategory(cacheMap, item.category, item.deep);
      result.categories[item.category] = categoryResult;
      result.totalBytesFreed += categoryResult.totalBytesFreed;

      if (categoryResult.hasErrors) {
        result.hasErrors = true;
      }
    }

    result.totalBytesFreedFormatted = formatSize(result.totalBytesFreed);

    printJson({
      ok: true,
      command: "clean-all",
      status: "cleaned",
      protectedCategories,
      minThreshold,
      candidates,
      result
    });
    return;
  }

  if (!force) {
    console.log(`\n${logger.color("Total:", "cyan")} ${formatSize(totalBytes)}`);
    console.log(`${logger.color("Categories:", "cyan")} ${candidates.length}`);

    if (protectedCategories.length > 0) {
      console.log(`${logger.color("Protected:", "cyan")} ${protectedCategories.join(", ")}`);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`\n${logger.color("Clean ALL caches?", "red")} (y/N): `, (answer) => {
      rl.close();
      if (answer.toLowerCase() !== "y") {
        logger.warning("Cancelled");
        process.exit(0);
      }
      doClean();
    });
  } else {
    doClean();
  }

  function doClean() {
    const hasAnyDeep = candidates.some((item) => item.deep);
    logger.info(`Cleaning selected categories${hasAnyDeep ? " (includes deep)" : ""}...`);

    const result = {
      categories: {},
      totalBytesFreed: 0,
      totalBytesFreedFormatted: "0 B",
      hasErrors: false
    };

    for (const item of candidates) {
      const categoryResult = cleanCategory(cacheMap, item.category, item.deep);
      result.categories[item.category] = categoryResult;
      result.totalBytesFreed += categoryResult.totalBytesFreed;

      if (categoryResult.hasErrors) {
        result.hasErrors = true;
      }
    }

    result.totalBytesFreedFormatted = formatSize(result.totalBytesFreed);
    logger.printCleanResults(result);
  }
}

/**
 * Handle configuration
 */
function handleConfig(opts, config) {
  if (opts.json) {
    printJson({ ok: true, command: "config", config });
    return;
  }

  console.log("\n📋 Current Configuration:");
  console.log(JSON.stringify(config, null, 2));
}

// Export for testing
export { main, handleScan, handleClean, handleCleanAll };

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith("system-clean.js")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}