import { registerAuthHandlers } from './auth.js';
import { registerDashboardHandlers } from './dashboard.js';
import { registerInventoryHandlers } from './inventory.js';
import { registerCatalogHandlers } from './catalog.js';
import { registerSupplierHandlers } from './suppliers.js';
import { registerPurchaseHandlers } from './purchases.js';
import { registerSalesHandlers } from './sales.js';
import { registerTransactionHandlers, registerAnalyticsHandlers } from './reports.js';
import { registerCustomerHandlers } from './customers.js';
import { registerSalesmanHandlers } from './salesmen.js';
import { registerPaymentHandlers } from './payments.js';
import { registerBankingHandlers } from './banking.js';
import { registerFinancialReportsHandlers } from './financialreports.js';
import { registerExportHandlers } from './exports.js';
import { registerBillMessageHandlers } from './messages.js';
import { registerPrintingHandler } from './printing.js';
import { registerAppInfoHandler } from './appInfo.js';
import { registerOpeningStockHandlers} from './openingstock.js';
import { registerCompanyHandlers } from './company.js';
import { registerNotesHandlers } from './notes.js';
import { registerDynamicReportsHandlers } from './dynamicreports.js';
import { registerStockMovementHandlers } from './stockmovements.js';
import { registerSettingsHandlers } from './settings.js';

export function registerAllHandlers(context) {
  const {
    ipcMain,
    getDb,
    dialog, // Make sure dialog is passed
    shell,
    mainWindow,
    isDev,
    paths,
    app,
    machineId,
    backupManager,
    licenseManager
  } = context;

  registerAuthHandlers({ ipcMain, getDb });
  registerDashboardHandlers({ ipcMain, getDb });
  registerInventoryHandlers({ ipcMain, getDb });
  registerCatalogHandlers({ ipcMain, getDb });
  registerSupplierHandlers({ ipcMain, getDb });
  registerCustomerHandlers({ ipcMain, getDb });
  registerSalesmanHandlers({ ipcMain, getDb });

   registerCompanyHandlers({ ipcMain, getDb, dialog });
  // const reduceClosingStock = createClosingStockReducer(getDb);
  // registerClosingStockHandlers({ ipcMain, getDb });
  registerOpeningStockHandlers({ ipcMain, getDb });

  registerPurchaseHandlers({ ipcMain, getDb });
  registerBankingHandlers({ ipcMain, getDb });
  registerSalesHandlers({ ipcMain, getDb });
  registerFinancialReportsHandlers(context);
  registerPaymentHandlers({ ipcMain, getDb });

  registerTransactionHandlers({ ipcMain, getDb });
  registerAnalyticsHandlers({ ipcMain, getDb });
  registerExportHandlers({ ipcMain, getDb });

  registerBillMessageHandlers({ ipcMain, getDb });
  registerPrintingHandler({ ipcMain, shell });
  registerAppInfoHandler({ ipcMain, app, packageJsonPath: paths.packageJson });

  registerNotesHandlers({ ipcMain, getDb });
  registerDynamicReportsHandlers({ ipcMain, getDb });
  registerStockMovementHandlers({ ipcMain, getDb });
  registerSettingsHandlers({ ipcMain, getDb });

  if (backupManager) {
    // backup handlers registered via manager during creation
  }

  if (licenseManager) {
    // license manager handled registration during creation
  }

}


