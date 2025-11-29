const { contextBridge, ipcRenderer } = require('electron');

const channelGroups = {
  app: {
    getAppInfo: 'get-app-info'
  },
  auth: {
    login: 'login',
    verifyPin: 'verify-pin',
    verifyApprovePin: 'verify-approve-pin'
  },
  dashboard: {
    getDashboardData: 'get-dashboard-data'
  },
  inventory: {
    getInventory: 'get-inventory',
    addItem: 'add-item',
    updateItem: 'update-item',
    deleteItem: 'delete-item',
    getItemDetails: 'get-item-details',
    getItems: 'get-items',
    getItemBatches: 'get-item-batches',
    checkSkuExists: 'check-sku-exists',
    checkCategoryExists: 'check-category-exists',
    checkGstExists: 'check-gst-exists',
    getItemPurchaseHistory: 'get-item-purchase-history',
    getNextSku: 'get-next-sku'
  },
  categories: {
    getCategories: 'get-categories',
    addCategory: 'add-category',
    deleteCategory: 'delete-category'
  },
  suppliers: {
    getSuppliers: 'get-suppliers',
    addSupplier: 'add-supplier',
    updateSupplier: 'update-supplier',
    deleteSupplier: 'delete-supplier'
  },
  units: {
    getUnits: 'get-units',
    addUnit: 'add-unit',
    deleteUnit: 'delete-unit'
  },
  gst: {
    getGstRates: 'get-gst-rates',
    addGstRate: 'add-gst-rate',
    deleteGstRate: 'delete-gst-rate'
  },
  purchases: {
    savePurchase: 'save-purchase',
    getPurchaseHistory: 'get-purchase-history',
    getPurchaseDetails: 'get-purchase-details',
    getPurchaseFullDetails: 'get-purchase-full-details',
    generatePurchaseOrderPdf: 'generate-purchase-order-pdf',
    updatePurchase: 'update-purchase',
    checkPurchaseEditStock: 'check-purchase-edit-stock',
    checkPurchaseDeleteStock: 'check-purchase-delete-stock',
    deletePurchase: 'delete-purchase'
  },
  sales: {
    generateBillNumber: 'generate-bill-number',
    saveSale: 'save-sale',
    updateSale: 'update-sale',
    deleteBill: 'delete-bill',
    getSaleDetails: 'get-sale-details',
    getFilteredSales: 'get-filtered-sales',
    updateSalePaidStatus: 'update-sale-paid-status',
    updateSaleApprovedStatus: 'update-sale-approved-status',
    getSalesHistory: 'get-sales-history',
    getSalePaymentForApproval: 'get-sale-payment-for-approval',
    getApprovalHistory: 'get-approval-history',
  },
  transactions: {
    getTransactions: 'get-transactions',
    getTransactionDetails: 'get-transaction-details'
  },
  analytics: {
    getAnalyticsData: 'get-analytics-data'
  },
  banking: {
    getBankAccounts: 'get-bank-accounts',
    getBankAccountDetails: 'get-bank-account-details',
    addBankAccount: 'add-bank-account',
    updateBankAccount: 'update-bank-account',
    deleteBankAccount: 'delete-bank-account',
    generateVoucherNumber: 'generate-voucher-number',
    updateBankTransaction: 'update-bank-transaction',
    saveBankTransaction: 'save-bank-transaction',
    getBankTransactions: 'get-bank-transactions',
    getBankTransactionDetails: 'get-bank-transaction-details',
    updateChequeStatus: 'update-cheque-status',
    deleteBankTransaction: 'delete-bank-transaction',
    depositCheque: 'deposit-cheque',
    clearCheque: 'clear-cheque',
    bounceCheque: 'bounce-cheque',
    cancelCheque: 'cancel-cheque',
    getUnreconciledTransactions: 'get-unreconciled-transactions',
    reconcileTransactions: 'reconcile-transactions',
    getReconciliationHistory: 'get-reconciliation-history',
    getPdcList: 'get-pdc-list',
    updatePdcStatus: 'update-pdc-status',
    getAllParties: 'get-all-parties',
     getTransactionCategories: 'get-transaction-categories',
    addTransactionCategory: 'add-transaction-category',
    updateTransactionCategory: 'update-transaction-category',
    deleteTransactionCategory: 'delete-transaction-category',
    getBankStatement: 'get-bank-statement',
    getCashflowReport: 'get-cashflow-report',
    getDaybook: 'get-daybook'
  },
  notes: {
    createCreditDebitNote: 'create-credit-debit-note',
    updateCreditDebitNote: 'update-credit-debit-note',
    deleteCreditDebitNote: 'delete-credit-debit-note',
    getCreditDebitNotes: 'get-credit-debit-notes'
  },
  dynamicReports: {
    getReportTypes: 'get-report-types',
    generateDynamicReport: 'generate-dynamic-report',
    getReportFilterOptions: 'get-report-filter-options',
    generateComplexReport: 'generate-complex-report',
    generateCustomReport: 'generate-custom-report'
  },
  stockMovements: {
    // Godown/Branch Management
    getGodowns: 'get-godowns',
    getActiveGodowns: 'get-active-godowns',
    addGodown: 'add-godown',
    updateGodown: 'update-godown',
    deleteGodown: 'delete-godown',

    // Stock Movement Operations
    generateMovementNumber: 'generate-movement-number',
    createStockMovement: 'create-stock-movement',
    getStockMovements: 'get-stock-movements',
    getStockMovementDetails: 'get-stock-movement-details',
    updateMovementStatus: 'update-movement-status',
    receiveStockMovement: 'receive-stock-movement',
    deleteStockMovement: 'delete-stock-movement',

    // Stock by Location
    getItemStockByLocation: 'get-item-stock-by-location',
    getLocationStock: 'get-location-stock',
    getInventoryForTransfer: 'get-inventory-for-transfer'
  },
  backup: {
    backupDatabase: 'backup-database',
    restoreDatabase: 'restore-database',
    getLastBackupDate: 'get-last-backup-date'
  },
  database: {
    getDatabaseSize: 'get-database-size'
  },
  customers: {
    createCustomerIfNeeded: 'create-customer-if-needed',
    getCustomers: 'get-customers',
    addCustomer: 'add-customer',
    updateCustomer: 'update-customer',
    deleteCustomer: 'delete-customer'
  },
  salesmen: {
    addSalesman: 'add-salesman',
    getSalesmen: 'get-salesmen',
    updateSalesman: 'update-salesman',
    deleteSalesman: 'delete-salesman'
  },
  payments: {
    savePayment: 'save-payment',
    getPaymentDetails: 'get-payment-details',
    updatePaymentStatus: 'update-payment-status',
    savePurchasePayment: 'save-purchase-payment',
    getPurchasePaymentDetails: 'get-purchase-payment-details'
  },
  exports: {
    getExportInventoryData: 'get-export-inventory-data',
    getExportSalesData: 'get-export-sales-data',
    getExportPurchaseData: 'get-export-purchase-data'
  },
  openingStock: {
    setOpeningStock: 'set-opening-stock',
    getOpeningStock: 'get-opening-stock',
    getAllOpeningStock: 'get-all-opening-stock',
    lockOpeningStock: 'lock-opening-stock',
    unlockOpeningStock: 'unlock-opening-stock',
    lockAllOpeningStocks: 'lock-all-opening-stocks',
    calculateOpeningFromClosing: 'calculate-opening-from-closing'
  },
    company: {
    getCompanyInfo: 'get-company-info',
    verifyCompanyPin: 'verify-company-pin',
    updateCompanyInfo: 'update-company-info',
    changeCompanyPin: 'change-company-pin',
    toggleCompanyLock: 'toggle-company-lock',
    uploadCompanyLogo: 'upload-company-logo',
    removeCompanyLogo: 'remove-company-logo',
    getDefaultLogoPath: 'get-default-logo-path',
     getLogoAsBase64: 'get-logo-as-base64' ,
  },
  // closingStock: {
  //   updateClosingStock: 'update-closing-stock',
  //   getClosingStock: 'get-closing-stock',
  //   calculateClosingStock: 'calculate-closing-stock'
  // },
  messages: {
    getBillMessage: 'get-bill-message',
    setBillMessage: 'set-bill-message'
  },
   financialReports: {
    getProfitAndLoss: 'get-profit-and-loss',
    getBalanceSheet: 'get-balance-sheet'
  },
  printing: {
    printPdf: 'print-pdf'
  }
};

const createInvoker = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

const electronAPI = Object.entries(channelGroups).reduce((api, [, channels]) => {
  Object.entries(channels).forEach(([name, channel]) => {
    api[name] = createInvoker(channel);
  });
  return api;
}, {});

// Add openExternal method separately
electronAPI.openExternal = (url) => ipcRenderer.invoke('open-external', url);

electronAPI.getExportSalesData = (startDateOrParams, maybeEndDate) => {
  const payload =
    typeof startDateOrParams === 'object'
      ? startDateOrParams
      : { startDate: startDateOrParams, endDate: maybeEndDate };
  return ipcRenderer.invoke('get-export-sales-data', payload);
};

electronAPI.getExportPurchaseData = (startDateOrParams, maybeEndDate) => {
  const payload =
    typeof startDateOrParams === 'object'
      ? startDateOrParams
      : { startDate: startDateOrParams, endDate: maybeEndDate };
  return ipcRenderer.invoke('get-export-purchase-data', payload);
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);