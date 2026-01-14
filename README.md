Read [](file:///e%3A/SVITHUB/BillingSoftware/TheMainSoftware/BillingSoftware/CLAUDE.md#1-1), lines 1 to 50

Here's a comprehensive README for your project:

```markdown
# SV's BizzSaathi

Modern billing and commission management desktop application built with Electron, React, and SQLite.

## Overview

**SV's BizzSaathi** is a complete offline-capable business management solution designed for Windows. It handles inventory management, billing, purchases, financial reporting, and commission tracking.

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Desktop**: Electron 37
- **Database**: better-sqlite3 (SQLite)
- **Charts**: Chart.js with react-chartjs-2
- **PDF/Excel Export**: @react-pdf/renderer, jspdf, exceljs

## Prerequisites

- **Node.js**: Version 22.x (NODE_MODULE_VERSION 136 required for Electron 37)
- **npm**: Latest version
- **NVM** (recommended): For managing Node.js versions

### Checking/Switching Node Version with NVM

```bash
# List installed Node.js versions
nvm list

# Install Node.js 22 (if not installed)
nvm install 22

# Switch to Node.js 22
nvm use 22

# Set Node.js 22 as default
nvm alias default 22
```

## Installation

```bash
# Clone the repository
git clone https://github.com/InfernoTJ/BillingSoftware.git
cd BillingSoftware

# Install dependencies
npm install

# Rebuild native modules for Electron (if needed)
npx electron-rebuild -f
```

### Troubleshooting Native Modules

If you encounter `NODE_MODULE_VERSION` errors:

```bash
# Ensure you're on Node.js 22
nvm use 22

# Force rebuild all native modules
npx electron-rebuild -f

# Or rebuild specific module
npx electron-rebuild -f -w better-sqlite3

# If issues persist, clean install
rm -rf node_modules
npm install
npx electron-rebuild -f
```

## Development

```bash
# Start development server (Vite + Electron)
npm run dev

# Run only Vite dev server
npm run dev:vite

# Run only Electron (requires Vite server running)
npm run dev:electron

# Lint code
npm run lint

# Preview production build
npm preview
```

## Building

```bash
# Build frontend only
npm run build

# Build complete Electron app with installer
npm run build:electron

# Create distribution packages (NSIS + Portable)
npm run dist
```

Build outputs are in dist-electron:
- NSIS Installer: `SV's BizzSaathi Setup x.x.x.exe`
- Portable: `SV's BizzSaathi x.x.x.exe`

## Project Structure

```
electron/
├── main.js                 # Electron main process
├── preload.js             # IPC bridge (frontend ↔ backend)
├── database/
│   ├── index.js           # Database initialization
│   └── migrations.js      # Schema migrations
├── handlers/              # IPC handlers by domain
│   ├── index.js           # Handler registry
│   ├── sales.js
│   ├── purchases.js
│   ├── inventory.js
│   └── ...
└── utils/                 # Utilities

src/
├── App.jsx                # Main app with routing
├── components/            # React components
│   ├── Billing.jsx        # Sales entry
│   ├── Purchase.jsx       # Purchase entry
│   ├── Inventory.jsx      # Inventory management
│   └── ...
└── Context/               # React contexts
```

## Key Features

- **Inventory Management**: Items, categories, units, batches with expiry tracking
- **Sales & Billing**: GST-compliant invoicing with multiple payment modes
- **Purchase Management**: Purchase orders and invoices with batch tracking
- **Financial Reports**: Balance sheet, P&L, ledger reports
- **Banking**: Bank reconciliation and transaction management
- **Commission Tracking**: Salesman-wise commission calculations
- **Multi-location**: Godown/branch support for inventory
- **Credit/Debit Notes**: Sales and purchase returns/adjustments
- **Export**: Excel and PDF export capabilities
- **Backup/Restore**: Database backup and restore functionality

## Keyboard Shortcuts

- `Ctrl+D` - Dashboard
- `Ctrl+I` - Inventory
- `Ctrl+P` - New Purchase
- `Ctrl+O` - Purchase Order
- `Ctrl+B` - New Sale/Billing
- `Ctrl+H` - Sales History
- `Ctrl+L` - Ledger
- `Ctrl+U` - Company Settings
- `Ctrl+Y` - Analytics
- `Ctrl+E` - Export
- `Ctrl+N` - Admin Panel
- `Ctrl+K` - Banking

## Documentation

For detailed development guidelines and architecture information, see CLAUDE.md.

## License

Proprietary - © 2025 S V IT HUB

## Author

**Tanmay Joshi**  
S V IT HUB

## Support

For issues and support, visit [SVs-BizzSaathi.com](https://SVs-BizzSaathi.com)
```

This README includes all the npm/npx commands you use in the project and references the CLAUDE.md file for detailed technical documentation.This README includes all the npm/npx commands you use in the project and references the CLAUDE.md file for detailed technical documentation.