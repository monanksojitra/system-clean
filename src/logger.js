/**
 * Logger Module
 * Provides formatted console output
 */

import { formatSize } from "./scanner.js";
import { CATEGORIES } from "./cache-map.js";

let useColors = true;

// Simple color implementation (fallback if chalk not available)
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  redBright: "\x1b[91m",
  greenBright: "\x1b[92m",
  yellowBright: "\x1b[93m",
  blueBright: "\x1b[94m",
  magentaBright: "\x1b[95m",
  cyanBright: "\x1b[96m"
};

/**
 * Set color usage
 * @param {boolean} use - Whether to use colors
 */
export function setColors(use) {
  useColors = use;
}

/**
 * Apply color to string
 */
export function color(text, colorName) {
  if (!useColors) return text;
  return `${colors[colorName]}${text}${colors.reset}`;
}

/**
 * Print banner/header
 */
export function banner(text) {
  console.log(color(`\n${text}`, "cyanBright"));
}

/**
 * Print subheader
 */
export function subheader(text) {
  console.log(color(text, "cyan"));
}

/**
 * Print success message
 */
export function success(text) {
  console.log(color(`✅ ${text}`, "green"));
}

/**
 * Print error message
 */
export function error(text) {
  console.log(color(`❌ ${text}`, "red"));
}

/**
 * Print warning message
 */
export function warning(text) {
  console.log(color(`⚠️  ${text}`, "yellow"));
}

/**
 * Print info message
 */
export function info(text) {
  console.log(color(`ℹ️  ${text}`, "blue"));
}

/**
 * Print step message
 */
export function step(text) {
  console.log(color(`👉 ${text}`, "magenta"));
}

/**
 * Print a horizontal line
 */
export function line(char = "─", length = 50) {
  console.log(color(char.repeat(length), "gray"));
}

/**
 * Print table header
 */
export function tableHeader(columns, widths) {
  const header = columns.map((col, i) => col.padEnd(widths[i] || 20)).join(" | ");
  console.log(color(header, "bright"));
  const separator = widths.map((w, i) => "-".repeat(w || 20)).join("-+-");
  console.log(color(separator, "gray"));
}

/**
 * Print table row
 */
export function tableRow(values, widths) {
  const row = values.map((val, i) => String(val).padEnd(widths[i] || 20)).join(" | ");
  console.log(row);
}

/**
 * Print system info
 */
export function systemInfo(sysInfo) {
  console.log(color(`\n🖥️  ${sysInfo.os} ${sysInfo.release}`, "cyan"));
  console.log(color(`   Platform: ${sysInfo.platform}`, "gray"));
  if (sysInfo.distro) {
    console.log(color(`   Distro: ${sysInfo.distro}`, "gray"));
  }
  console.log(color(`   Home: ${sysInfo.homedir}`, "gray"));
  console.log(color(`   Cache: ${sysInfo.cachedir}`, "gray"));
}

/**
 * Print scan results as table
 */
export function printScanTable(scanResults) {
  console.log(color("\n📁 Cache Summary:", "cyanBright"));
  line();

  const widths = [15, 20, 10, 25];

  // Header
  tableHeader(["Category", "Cache", "Size", "Description"], widths);

  // Rows
  for (const [category, result] of Object.entries(scanResults.categories)) {
    if (!result.entries || result.entries.length === 0) continue;

    for (const entry of result.entries) {
      tableRow(
        [entry.category, entry.name, entry.sizeFormatted, entry.description],
        widths
      );
    }
  }

  line();

  // Total
  const totalLabel = "Total".padEnd(15);
  const sizeLabel = scanResults.totalSizeFormatted.padStart(10);
  console.log(color(`${totalLabel} ${sizeLabel}`, "greenBright"));
}

/**
 * Print clean results
 */
export function printCleanResults(cleanResults) {
  console.log(color("\n🧹 Clean Results:", "cyanBright"));
  line();

  let totalFreed = 0;

  for (const [category, result] of Object.entries(cleanResults.categories)) {
    if (result.totalBytesFreed === 0) continue;

    totalFreed += result.totalBytesFreed;
    console.log(color(`\n${category.toUpperCase()}:`, "yellow"));

    for (const entry of result.entries) {
      if (entry.totalBytesFreed > 0) {
        success(`${entry.name}: ${entry.totalBytesFreedFormatted}`);

        for (const err of entry.errors || []) {
          error(`  ${err.path}: ${err.error}`);
        }
      }
    }
  }

  line();
  console.log(color(`\n💾 Total Freed: ${formatSize(totalFreed)}`, "greenBright"));
}

/**
 * Print simple summary (non-tech friendly)
 */
export function printSimpleSummary(scanResults) {
  const total = scanResults.totalSizeFormatted;
  const entries = [];

  for (const [category, data] of Object.entries(scanResults.summary)) {
    const label = {
      [CATEGORIES.PACKAGE]: "Package managers",
      [CATEGORIES.WEB]: "Web browsers",
      [CATEGORIES.BUILD]: "Build tools",
      [CATEGORIES.SYSTEM]: "System files"
    }[category];

    if (label) {
      entries.push(`- ${label}: ${formatSize(data.size)}`);
    }
  }

  console.log(color("\n🧹 Cache Cleaner", "cyanBright"));
  console.log(color(`Found: ${total} of caches can be freed\n`, "white"));

  for (const e of entries) {
    console.log(e);
  }
}

/**
 * Print interactive menu
 */
export function printMenu(options) {
  console.log(color("\n📋 Options:", "cyanBright"));

  for (const [key, label] of Object.entries(options)) {
    console.log(color(`  [${key}] ${label}`, "white"));
  }

  console.log(color("  [q] Quit", "gray"));
}

/**
 * Print help message
 */
export function printHelp() {
  console.log(`
${color("Usage:", "cyan")}
  ${color("system-clean", "green")} [command] [options]

${color("Commands:", "cyan")}
  ${color("scan", "green")}           Scan caches without cleaning
  ${color("clean", "green")} <category>  Clean specific category
  ${color("clean-all", "green")}      Clean all categories (asks first)
  ${color("audit", "green")}          Run security & supply chain audit
  ${color("config", "green")}         Edit configuration
  ${color("help", "green")}         Show this help

${color("Options:", "cyan")}
  ${color("--deep", "yellow")}       Include protected caches (browsers, system)
  ${color("--force", "yellow")}      Skip confirmation
  ${color("--simple", "yellow")}     Simple non-tech output
  ${color("--json", "yellow")}       Machine-readable JSON output
  ${color("--table", "yellow")}      Table output (default)
  ${color("--dry-run", "yellow")}      Same as scan
  ${color("--global", "yellow")}     (Audit only) Scan global npm packages
  ${color("-h, --help", "yellow")}     Show help

${color("Categories:", "cyan")}
  ${color("package", "green")}  npm, yarn, pip, uv, cargo, go, etc.
  ${color("web", "green")}     Browser caches
  ${color("build", "green")}    Build tool caches
  ${color("system", "green")} System caches

${color("Examples:", "cyan")}
  ${color("system-clean scan", "gray")}
  ${color("system-clean clean package", "gray")}
  ${color("system-clean clean-all --deep --force", "gray")}
  ${color("system-clean audit", "gray")}
  ${color("system-clean audit --global", "gray")}

${color("Learn more:", "cyan")}
  https://github.com/monanksojitra/system-clean
  `);
}

export default {
  setColors,
  color,
  banner,
  subheader,
  success,
  error,
  warning,
  info,
  step,
  line,
  systemInfo,
  printScanTable,
  printCleanResults,
  printSimpleSummary,
  printMenu,
  printHelp
};