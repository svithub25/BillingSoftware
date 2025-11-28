# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SV's BizzSaathi** is an Electron-based billing and commission management desktop application for Windows. It combines React (frontend) with Electron (desktop wrapper) and better-sqlite3 (local database) to create a complete offline-capable business management solution.

## Development Commands

```bash
# Development (runs Vite dev server + Electron concurrently)
npm run dev

# Build frontend only
npm run build

# Build distributable Electron app
npm run build:electron

# Create distribution packages without publishing
npm run dist

# Lint code
npm run lint

# Preview production build
npm preview
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS
- **Desktop**: Electron 37
- **Database**: better-sqlite3 (local SQLite database)
- **IPC**: Electron IPC for frontend-backend communication via preload script
- **Routing**: React Router v7
- **Charts**: Chart.js with react-chartjs-2
- **PDF Generation**: @react-pdf/renderer, jspdf
- **Excel Export**: exceljs

### Application Flow

1. **Electron Main Process** (`electron/main.js`):
   - Initializes environment and database
   - Creates main window
   - Registers all IPC handlers via `registerAllHandlers()`
   - Manages machine ID for licensing
   - Handles backup and license managers

2. **IPC Communication** (`electron/preload.js`):
   - Exposes `window.api` object to frontend
   - Organized into channel groups: auth, dashboard, inventory, sales, purchases, etc.
   - All backend communication must go through defined channels

3. **Database** (`electron/database/index.js`):
   - Single SQLite database file (`database.db`)
   - Migrations handled via `migrations.js`
   - Tables include: users, items, categories, suppliers, customers, salesmen, purchases, sales, payments, banking, etc.

4. **IPC Handlers** (`electron/handlers/*.js`):
   - Each domain has its own handler file (inventory.js, sales.js, purchases.js, etc.)
   - All registered centrally in `handlers/index.js`
   - Handlers receive `{ ipcMain, getDb }` and other context as needed

5. **React Frontend** (`src/`):
   - `App.jsx`: Main routing, authentication state, global hotkeys
   - `Layout.jsx`: Navigation sidebar with keyboard shortcuts
   - Components organized by feature (Billing, Purchase, Inventory, etc.)

### Key Architectural Patterns

**IPC Pattern**: Frontend → `window.api.{group}.{method}()` → Preload → IPC Main Handler → Database → Response

**Example**:
```javascript
// Frontend (src/components/Billing.jsx)
const items = await window.api.inventory.getItems();

// Preload (electron/preload.js)
inventory: {
  getItems: () => ipcRenderer.invoke('get-items')
}

// Handler (electron/handlers/inventory.js)
ipcMain.handle('get-items', async () => {
  const db = getDb();
  return db.prepare('SELECT * FROM items WHERE status_code = 0').all();
});
```

**Status Code Pattern**: All entities use `status_code`:
- `0` = Active
- `1` = Deleted/Inactive
- Soft deletes are used throughout (never hard delete records)

**Database Access**: All database operations go through `getDb()` function passed to handlers. Use prepared statements with better-sqlite3.

### Important Modules

**Backup Manager** (`electron/handlers/backup.js`):
- Handles database backup/restore
- Uses dialog for file selection
- Closes and reopens database connection during restore

**License Manager** (`electron/handlers/license.js`):
- Validates machine ID against license
- Manages trial and activation status

**Financial Reports** (`electron/handlers/financialreports.js`):
- Generates balance sheets, P&L statements
- Complex SQL queries for ledger data

**Batch Tracking**: Items can have multiple batches with different MRP/purchase rates. The `batches` table tracks inventory by batch with expiry dates.

**Credit/Debit Notes** (`electron/handlers/notes.js`, `src/components/CreditDebitNote.jsx`):
- Handles adjustments to purchases/sales
- Recent addition to codebase

### Database Schema Highlights

- **items**: Products with SKU, HSN, GST%, rates, stock tracking
- **purchases/purchase_items**: Purchase invoices with line items
- **sales/sale_items**: Sales invoices with line items
- **batches**: Batch-level inventory tracking with MRP, expiry
- **payments**: Tracks payments against invoices
- **banking**: Bank transactions and reconciliation
- **salesmen**: Commission tracking for sales staff
- **customers**: Customer master with GSTIN
- **godown_branches**: Multi-location inventory support

### React Routing Structure

Routes defined in `App.jsx`:
- `/` → Login
- `/dashboard` → Dashboard (Ctrl+D)
- `/inventory` → Inventory management (Ctrl+I)
- `/purchase` → New purchase entry (Ctrl+P)
- `/purchase-order` → Purchase order (Ctrl+O)
- `/billing` → Create sale/bill (Ctrl+B)
- `/sales-history` → View sales (Ctrl+H)
- `/ledger` → Financial reports (Ctrl+L)
- `/company` → Company settings (Ctrl+U)
- `/analytics` → Analytics dashboard (Ctrl+Y)
- `/export` → Export data (Ctrl+E)
- `/admin` → Admin panel (Ctrl+N)
- `/banking` → Banking module (Ctrl+K)

Global keyboard shortcuts are defined using `react-hotkeys-hook`.

## Development Guidelines

### Adding a New Feature

1. **Database**: Add table/columns in `electron/database/index.js` or create migration in `migrations.js`
2. **IPC Handler**: Create handler function in appropriate `electron/handlers/*.js` file
3. **Register Handler**: Add to `registerAllHandlers()` in `electron/handlers/index.js`
4. **Preload**: Add IPC channel to `electron/preload.js` in appropriate channel group
5. **Frontend**: Create/update React component in `src/components/`
6. **Route**: Add route in `App.jsx` if needed

### IPC Channel Naming Convention

- Channels use kebab-case: `get-inventory`, `save-purchase`
- Group related channels in preload.js: `window.api.inventory.*`, `window.api.sales.*`
- Handler names match channel names exactly

### Database Operations

Always use prepared statements:
```javascript
const db = getDb();
const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
const item = stmt.get(itemId);
```

For transactions:
```javascript
const db = getDb();
db.transaction(() => {
  // Multiple operations
})();
```

### Stock Management

Stock updates happen in multiple places:
- Purchase entry increases stock
- Sale entry decreases stock
- Credit/debit notes adjust stock
- Stock transfers between godowns/branches

Always update both `items.current_stock` and batch-level stock when applicable.

### Testing Purchases and Sales

The application includes sample SQL files for testing:
- `01credittdebit.sql` - Credit/debit note data
- `02units.sql` - Unit definitions
- `03godownbranch.sql` - Godown/branch setup

## Build and Distribution

The app builds for Windows with two targets:
- **NSIS installer**: Full installer with options
- **Portable**: Standalone executable

Build output goes to `dist-electron/` directory.

The build includes:
- Compiled frontend (`dist/`)
- Electron main/preload scripts
- Database file
- Machine ID executable (`get_machine_id.exe`)

## File Structure

```
electron/
├── main.js                 # Electron entry point
├── preload.js             # IPC bridge (frontend ↔ backend)
├── database/
│   ├── index.js           # Database initialization & schema
│   └── migrations.js      # Database migrations
├── handlers/              # IPC handlers (one per domain)
│   ├── index.js           # Registers all handlers
│   ├── sales.js
│   ├── purchases.js
│   ├── inventory.js
│   └── [others...]
├── windows/               # Window creation
└── config/                # Environment config

src/
├── App.jsx                # Main app, routing, auth
├── components/            # React components
│   ├── Billing.jsx        # Sales entry
│   ├── Purchase.jsx       # Purchase entry
│   ├── Inventory.jsx      # Inventory management
│   ├── Ledger/            # Financial reports
│   └── [others...]
└── [styles, assets, etc.]
```

## Common Issues

**Database locked errors**: Ensure database is properly closed before backup/restore operations.

**IPC channel not found**: Check that channel is registered in both preload.js and handlers/index.js with matching names.

**Stock discrepancies**: Verify that all stock-affecting operations (purchase, sale, credit note, debit note) properly update both `items.current_stock` and batch records.

**Build failures**: Ensure `dist/` folder exists before running electron-builder. Run `npm run build` first.
- Remeber to refer to the database schema @schema.sql when you try to add some major changes to the file as the forms or anything should be done schema wise
- I want you to refer to the @project-styling.md file for styling guidlines so that the pages that we create look similar to the existing software.