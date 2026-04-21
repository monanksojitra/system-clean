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
- [Discussions](https://github.com/monanksojitra/system-clean/discussions)
- Contact: [sojitramonank2003@gmail.com](mailto:sojitramonank2003@gmail.com)
- Sponsor/Donate: [Buy Me a Coffee](https://buymeacoffee.com/monanksojitra)

---

**Star ⭐ if you find it useful!**