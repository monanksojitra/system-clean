# system-clean

Cross-platform system cache cleaner for developers. Cleans npm, yarn, pip, uv, cargo, go, and other development caches to free up disk space.

[![npm](https://img.shields.io/npm/v/@monanksojitra/system-clean)](https://www.npmjs.com/package/@monanksojitra/system-clean)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/@monanksojitra/system-clean.svg)](https://nodejs.org)
[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)](https://github.com/monanksojitra)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-orange?logo=buymeacoffee&logoColor=white)](https://buymeacoffee.com/monanksojitra)

## Features

- **Multi-platform**: Linux (Ubuntu, Debian, Fedora, Arch), macOS, Windows (experimental)
- **Package Managers**: npm, yarn, pnpm, pip, uv, cargo, go, composer, gem
- **Browsers**: Chrome, Firefox, Brave, Edge, Chromium
- **Build Tools**: Gradle, Maven, Webpack, Vite, Next.js, Turborepo
- **Safe by Default**: Protected caches require `--deep` flag
- **Interactive & CLI**: Works as command-line tool or library

<div align="center">

# ⚠️  DISCLAIMER — PLEASE READ BEFORE USE  ⚠️

</div>

> **[!CAUTION]** **DESTRUCTIVE TOOL — USE AT YOUR OWN RISK**
>
> This tool **permanently deletes files and formats data**. There is no undo.
>
> **The author (`@monanksojitra`) and all contributors expressly disclaim any and all liability.** We **cannot and will not be held responsible** for any **data loss, file deletion, format corruption, system damage, or any other issues** — whether caused by misuse, bugs, or any other reason — arising from the use or misuse of this software. **By using this tool, you agree to assume 100% of all risk.**

### 🔴 NEVER do the following

| Action | Risk |
|--------|------|
| Run as `root` / `sudo` | Can delete system-critical files — **OS may become unbootable** |
| Use `--deep` without `scan` first | May delete browser profiles, configs, and irreplaceable data |
| Skip reviewing `scan` output | Blind deletion — you will not know what was removed |
| Run on a system you don't own | Unauthorized data destruction — **illegal in most jurisdictions** |
| Pipe into other commands / scripts blindly | May trigger unintended deletions via chained commands |

### 🟡 Best practices before every run

1. **Run `system-clean scan`** (or `system-clean scan --json`) first.
2. **Review every path** listed in the output — do not skip.
3. **Verify** each target path is actually a cache you intended to clean.
4. **Back up** important data before running `clean` or `clean-all`.
5. **Never run this tool** if you are unsure about any path it reports.
6. **Do not run scripts** from untrusted sources without reviewing their contents.

### 🛡️ You are responsible for your data

- **Always keep backups** of anything you cannot afford to lose.
- **Test on a non-critical system** first if you are unsure.
- **When in doubt, do not run.** A few hundred MB of cache is not worth your data.

<div align="center">

**By using this software, you acknowledge that you have read, understood, and accepted this disclaimer. You accept full responsibility for any consequences of using this tool.**

</div>

---

## Installation

```bash
# Using npm (global)
npm install -g @monanksojitra/system-clean

# Using npx (no install)
npx @monanksojitra/system-clean scan

# From source
git clone https://github.com/monanksojitra/system-clean.git
cd system-clean
npm install
npm link
```

## Usage

### Command Line

```bash
# Scan caches (dry-run) - shows what can be cleaned
system-clean scan

# Clean specific category
system-clean clean package
system-clean clean web
system-clean clean build

# Run security & supply chain audit on current directory
system-clean audit

# Audit global npm packages for suspicious lifecycle scripts
system-clean audit --global

# Clean all safe caches (asks confirmation)
system-clean clean-all

# Clean ALL caches including protected (browsers, system)
system-clean clean-all --deep

# Force clean without asking (good for scripts)
system-clean clean-all --deep --force

# Simple output (non-tech friendly)
system-clean scan --simple

# JSON output (automation/scripts)
system-clean scan --json
system-clean clean package --json --force
system-clean clean-all --json --force

# Run security & supply chain audit
system-clean audit

# Show help
system-clean help
```

### As Library

```javascript
import { quickScan, quickClean } from '@monanksojitra/system-clean';

// Scan first
const results = await quickScan({ deep: false });
console.log(`Found: ${results.totalSizeFormatted}`);

// Clean
const cleanResults = await quickClean('package', { deep: false });
console.log(`Freed: ${cleanResults.totalBytesFreedFormatted}`);
```

## Categories

| Category | Description | Default |
|----------|-------------|---------|
| `package` | npm, yarn, pip, uv, cargo, go, etc. | Always cleanable |
| `web` | Browser caches (Chrome, Firefox, Brave) | Needs `--deep` |
| `build` | Gradle, Maven, Webpack, Vite caches | Always cleanable |
| `system` | Thumbnails, tracker, trash | Needs `--deep` |

## Options

| Flag | Description |
|------|-------------|
| `--scan` | Scan only, don't clean (dry-run) |
| `--clean <cat>` | Clean specific category |
| `--clean-all` | Clean all categories |
| `--deep` | Include protected caches |
| `--force` | Skip confirmation |
| `--simple` | Simple non-tech output |
| `--json` | Machine-readable JSON output |
| `--audit` | Run security audit on dependencies and scripts |
| `--global` | (Audit only) Scan global npm packages |
| `--help` | Show help |

## Examples

### Check what's taking space

```bash
$ system-clean scan

🧹 System Clean - Cache Scanner
🖥️  Linux (Ubuntu 24.04)
   Platform: linux
   Distro: ubuntu
   Home: /home/user
   Cache: /home/user/.cache

📁 Cache Summary:
─────────────────────────────────────────────────────
Category     | Cache               | Size       | Description
-------------+--------------------+------------+---------------------------
package      | npm                 | 45 MB      | Node Package Manager
package      | yarn                | 890 MB     | Yarn Package Manager
package      | pip                 | 1.2 GB     | Python Package Manager
package      | uv                  | 450 MB     | UV Python Package Manager
package      | go                  | 651 MB     | Go Modules
build        | gradle              | 234 MB     | Gradle Build Tool
build        | node_gyp           | 67 MB      | Node.js native addons
-------------+--------------------+------------+---------------------------
Total        |                     | 3.5 GB

Total cleanable: 3.5 GB

Note: Use --deep to include protected caches
```

### Clean package managers

```bash
$ system-clean clean package

Category: package
Size: 3.5 GB
Entries: 5

Clean these caches? (y/N): y
Cleaning...
✅ npm: 45 MB freed
✅ yarn: 890 MB freed
✅ pip: 1.2 GB freed
✅ uv: 450 MB freed
✅ go: 651 MB freed

💾 Total Freed: 3.5 GB
```

### Clean everything (including browsers)

```bash
$ system-clean clean-all --deep --force

Cleaning all categories (--deep)...
✅ package: 3.5 GB freed
✅ web: 4.2 GB freed
✅ build: 890 MB freed
✅ system: 450 MB freed

💾 Total Freed: 9.0 GB
```

### JSON output for scripts

```bash
$ system-clean scan --json
{
  "ok": true,
  "command": "scan",
  "results": {
    "totalSize": 3758096384,
    "totalSizeFormatted": "3.5 GB"
  }
}
```

### Security & supply chain audit

```bash
# Scan local package.json for suspicious lifecycle scripts and run npm audit
$ system-clean audit

# Audit global npm packages
$ system-clean audit --global
```

## Security Notes

- **`--json` + `--force` required for cleaning**: When using `--json`, you must also pass `--force` for any clean operation. This prevents silent deletions in scripts — the tool will print a JSON error (`force_required`) and exit 1 otherwise.
- **Refuses to clean as root**: If the process is running with elevated privileges (`isElevated()` is true), all `clean` and `clean-all` commands exit 1 with a clear error message. `scan` and `audit` still run normally.
- **Browser caches only**: The `web` category targets cache subdirectories only (e.g., `Default/Cache`, `Default/Code Cache`, `GPUCache`, `ShaderCache`). Full browser profiles (history, cookies, logins) are never deleted — even with `--deep`.
- **Deny-listed paths**: Directories such as `~/.ssh`, `~/.config/google-chrome` (profiles), `~/.gnupg`, `~/.aws`, `~/.kube`, `~/.docker`, `~/.git`, and `~/.npm-global` are never deleted. `~/.local/share/Trash` is `--deep`-only.
- **Audit command**: `system-clean audit` scans `package.json` for suspicious lifecycle scripts (e.g., `postinstall` containing `curl |`, `node -e`, `eval(`) and runs `npm audit --json` when a lockfile is present. It exits 1 if any high/critical vulnerability or flagged lifecycle script is found.
- **No runtime dependencies**: This tool has zero runtime deps, no `postinstall`, no network calls, no `eval`, and no `sudo`.

## Configuration

Config file location:

- Linux: `~/.config/system-clean/system-clean.json`
- macOS: `~/Library/Application Support/system-clean/system-clean.json`
- Windows: `%APPDATA%/system-clean/system-clean.json`

```json
{
  "version": "1.0.0",
  "protected": [],
  "alwaysClean": ["package"],
  "deepClean": {
    "all": false,
    "web": false,
    "system": false
  },
  "confirmAll": true,
  "minThreshold": 0,
  "logFile": null,
  "color": true
}
```

### Configuration Options

- `protected`: Categories that are never cleaned (even with `--deep`)
- `alwaysClean`: Categories treated as deep-enabled by default
- `deepClean`: Per-category default deep-clean behavior
- `confirmAll`: Ask confirmation before cleaning
- `minThreshold`: Skip cleaning categories smaller than this size (bytes)
- `logFile`: Path to log file (null = no logging)
- `color`: Enable colored output

## Supported Package Managers

| Manager | Cache Location | Command |
|----------|----------------|---------|
| npm | ~/.npm | `npm cache clean` |
| yarn | ~/.cache/yarn | `yarn cache clean` |
| pnpm | ~/.cache/pnpm | `pnpm store prune` |
| pip | ~/.cache/pip | `pip cache purge` |
| uv | ~/.cache/uv | `uv cache clean` |
| cargo | ~/.cargo | `cargo clean` |
| go | ~/go/pkg/mod | `go clean -cache` |
| composer | ~/.composer | `composer clear-cache` |
| gem | ~/.gem | `gem cleanup` |

## Development

```bash
# Clone
git clone https://github.com/monanksojitra/system-clean.git

# Install dependencies
npm install

# Test
npm test

# Full local verification
npm run verify

# Run locally
node bin/system-clean.js scan

# Link for global use
npm link
```

## Release (Maintainers)

```bash
# 1) Update version
npm version patch

# 2) Verify locally
npm run verify

# 3) Push commit + version tag
git push && git push --tags
```

Release automation:

- CI runs on every push/PR via [.github/workflows/ci.yml](.github/workflows/ci.yml)
- npm publishing runs only on `v*` tags via [.github/workflows/release.yml](.github/workflows/release.yml)
- Tag version must match `package.json` version

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Create Pull Request

## Credits

- Author: [Monank Sojitra](https://github.com/monanksojitra)
- Inspired by: [npm-check](https://www.npmjs.com/package/npm-check), [yarn cache clean](https://yarnpkg.com/cli/cache/clean)

## Made With Love

Made with ❤️ by **Monank Sojitra**.

- GitHub: [@monanksojitra](https://github.com/monanksojitra)
- Email: [sojitramonank2003@gmail.com](mailto:sojitramonank2003@gmail.com)
- Buy Me a Coffee: [buymeacoffee.com/monanksojitra](https://buymeacoffee.com/monanksojitra)

## Support

- [Issues](https://github.com/monanksojitra/system-clean/issues)
- Contact: [sojitramonank2003@gmail.com](mailto:sojitramonank2003@gmail.com)
- Sponsor/Donate: [Buy Me a Coffee](https://buymeacoffee.com/monanksojitra)

---

**Star ⭐ if you find it useful!**