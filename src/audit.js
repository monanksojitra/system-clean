
/**
 * Audit Module
 * Scans package.json for suspicious lifecycle scripts and runs npm audit.
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import * as logger from "./logger.js";
import { formatSize } from "./scanner.js";

// List of npm lifecycle scripts that can be exploited
const LIFECYCLE_SCRIPTS = [
  "preinstall",
  "install",
  "postinstall",
  "preuninstall",
  "postuninstall",
  "prepare",
  "prepublish",
  "prepack",
];

// Simple denylist for suspicious commands within scripts
const SUSPICIOUS_PATTERNS = [
  /curl\s+\|/,
  /wget\s+/,
  /powershell/,
  /Invoke-WebRequest/,
  /node\s+-e/,
  /\/dev\/tcp/,
  /chmod\s+\+x/,
  /base64\s+-d/,
  /eval\(/,
  /child_process/,
  /mshta/,
  /reg\s+add/,
];

/**
 * Checks a script body for suspicious patterns.
 * @param {string} script - The script content to check.
 * @returns {Array<string>} List of matched suspicious patterns.
 */
function checkScriptForSuspiciousPatterns(script) {
  const matches = [];
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(script)) {
      matches.push(pattern.source);
    }
  }
  return matches;
}

/**
 * Scans a package.json for suspicious lifecycle scripts.
 * @param {string} packageJsonPath - Path to package.json.
 * @returns {object} Scan results.
 */
function scanLifecycleScripts(packageJsonPath) {
  const results = {
    filePath: packageJsonPath,
    hasSuspiciousScripts: false,
    suspiciousScripts: [],
  };

  if (!fs.existsSync(packageJsonPath)) {
    return { ...results, error: "package.json not found" };
  }

  try {
    const content = fs.readFileSync(packageJsonPath, "utf8");
    const pkg = JSON.parse(content);

    if (pkg.scripts) {
      for (const scriptName of LIFECYCLE_SCRIPTS) {
        if (pkg.scripts[scriptName]) {
          const scriptBody = pkg.scripts[scriptName];
          const suspiciousMatches = checkScriptForSuspiciousPatterns(scriptBody);
          if (suspiciousMatches.length > 0) {
            results.hasSuspiciousScripts = true;
            results.suspiciousScripts.push({
              name: scriptName,
              script: scriptBody,
              patterns: suspiciousMatches,
            });
          }
        }
      }
    }
  } catch (error) {
    return { ...results, error: `Failed to parse package.json: ${error.message}` };
  }

  return results;
}

/**
 * Runs npm audit for the given directory.
 * @param {string} cwd - Current working directory to run npm audit in.
 * @returns {object} npm audit results.
 */
function runNpmAudit(cwd) {
  const results = {
    hasVulnerabilities: false,
    auditOutput: null,
    error: null,
  };

  try {
    execFileSync("npm", ["audit", "--json", "--omit=dev"], {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    // If it exits with 0, no vulnerabilities found or only low severity
    // We need to parse output even if exit code is 0 as npm audit --json sometimes exits 0
    // even with vulnerabilities (depending on audit-level config)
  } catch (error) {
    if (error.stderr && error.stderr.includes("command not found")) {
      results.error = "npm command not found. Cannot run audit.";
      return results;
    }
    // npm audit exits with non-zero if vulnerabilities are found
    results.auditOutput = JSON.parse(error.stdout || "{}"); // Parse stdout from the failed command
    results.hasVulnerabilities = true; // Non-zero exit implies vulnerabilities
    return results;
  }

  return results;
}

/**
 * Main audit function.
 * @param {string} targetDir - Directory to audit.
 * @param {object} opts - CLI options (e.g., json, global).
 * @returns {object} Full audit report.
 */
export function audit(targetDir, opts = {}) {
  let finalReport = {
    target: targetDir,
    lifecycleScripts: [],
    npmAudit: null,
    globalPackageScripts: [],
    hasIssues: false,
  };

  if (opts.global) {
    try {
      const globalNpmRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
      const globalPackages = fs.readdirSync(globalNpmRoot);
      for (const pkgName of globalPackages) {
        const pkgPath = path.join(globalNpmRoot, pkgName, "package.json");
        const scriptScan = scanLifecycleScripts(pkgPath);
        if (scriptScan.hasSuspiciousScripts || scriptScan.error) {
          finalReport.globalPackageScripts.push(scriptScan);
          if (scriptScan.hasSuspiciousScripts) finalReport.hasIssues = true;
        }
      }
    } catch (error) {
      finalReport.globalPackageScripts.push({ error: `Failed to scan global packages: ${error.message}` });
    }
  } else {
    // Scan local package.json
    const packageJsonPath = path.join(targetDir, "package.json");
    const scriptScan = scanLifecycleScripts(packageJsonPath);
    if (scriptScan.hasSuspiciousScripts || scriptScan.error) {
      finalReport.lifecycleScripts.push(scriptScan);
      if (scriptScan.hasSuspiciousScripts) finalReport.hasIssues = true;
    }

    // Run npm audit if lockfile exists
    if (fs.existsSync(path.join(targetDir, "package-lock.json")) || fs.existsSync(path.join(targetDir, "yarn.lock")) || fs.existsSync(path.join(targetDir, "pnpm-lock.yaml"))) {
      finalReport.npmAudit = runNpmAudit(targetDir);
      if (finalReport.npmAudit.hasVulnerabilities) {
        finalReport.hasIssues = true;
      }
    } else {
        finalReport.npmAudit = {
            error: "No lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml) found. Skipping npm audit."
        };
    }
  }

  return finalReport;
}

/**
 * Prints the audit report in a human-readable format.
 * @param {object} report - The audit report.
 */
export function printAuditReport(report) {
    logger.banner("System Clean - Security Audit");
    logger.subheader(`Target: ${report.target}`);
    logger.line();

    if (report.globalPackageScripts.length > 0) {
        logger.info("Scanning global packages for suspicious lifecycle scripts...");
        for (const globalPkgReport of report.globalPackageScripts) {
            if (globalPkgReport.error) {
                logger.error(`Error scanning ${globalPkgReport.filePath}: ${globalPkgReport.error}`);
            } else if (globalPkgReport.hasSuspiciousScripts) {
                logger.warning(`Suspicious lifecycle scripts found in ${globalPkgReport.filePath}`);
                for (const script of globalPkgReport.suspiciousScripts) {
                    logger.error(`  Script '${script.name}': '${script.script}' (matched: ${script.patterns.join(", ")})`);
                }
            } else {
                logger.success(`No suspicious lifecycle scripts in ${globalPkgReport.filePath}`);
            }
        }
        logger.line();
    }


    if (report.lifecycleScripts.length > 0) {
        logger.info("Scanning local package.json for suspicious lifecycle scripts...");
        for (const scriptReport of report.lifecycleScripts) {
            if (scriptReport.error) {
                logger.error(`Error scanning ${scriptReport.filePath}: ${scriptReport.error}`);
            } else if (scriptReport.hasSuspiciousScripts) {
                logger.warning(`Suspicious lifecycle scripts found in ${scriptReport.filePath}`);
                for (const script of scriptReport.suspiciousScripts) {
                    logger.error(`  Script '${script.name}': '${script.script}' (matched: ${script.patterns.join(", ")})`);
                }
            } else {
                logger.success(`No suspicious lifecycle scripts in ${scriptReport.filePath}`);
            }
        }
        logger.line();
    }

    if (report.npmAudit) {
        logger.info("Running npm audit...");
        if (report.npmAudit.error) {
            logger.warning(report.npmAudit.error);
        } else if (report.npmAudit.hasVulnerabilities) {
            logger.error("npm audit found vulnerabilities:");
            const auditOutput = report.npmAudit.auditOutput;
            if (auditOutput && auditOutput.metadata && auditOutput.metadata.vulnerabilities) {
                const vulns = auditOutput.metadata.vulnerabilities;
                if (vulns.critical > 0) logger.error(`  Critical: ${vulns.critical}`);
                if (vulns.high > 0) logger.error(`  High: ${vulns.high}`);
                if (vulns.moderate > 0) logger.warning(`  Moderate: ${vulns.moderate}`);
                if (vulns.low > 0) logger.info(`  Low: ${vulns.low}`);
            }
            // Optionally print full audit report for manual inspection
            // console.log(JSON.stringify(auditOutput, null, 2));
        } else {
            logger.success("npm audit found no vulnerabilities (or only low severity)");
        }
        logger.line();
    }

    if (report.hasIssues) {
        logger.error("Audit completed with issues. Please review findings.");
    } else {
        logger.success("Audit completed with no issues.");
    }
}

export default {
  audit,
  printAuditReport,
  checkScriptForSuspiciousPatterns, // Exported for testing
  scanLifecycleScripts, // Exported for testing
  runNpmAudit, // Exported for testing
};
