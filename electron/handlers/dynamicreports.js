/**
 * Dynamic Reports Handler
 * Generates various combinational reports based on filters
 */

export function registerDynamicReportsHandlers({ ipcMain, getDb }) {
  /**
   * Get list of available report types
   */
  ipcMain.handle('get-report-types', async () => {
    return [
      {
        id: 'sales-by-customer',
        name: 'Sales by Customer',
        category: 'Sales',
        filters: ['dateRange', 'customer', 'salesman', 'paymentStatus']
      },
      {
        id: 'sales-by-item',
        name: 'Sales by Item',
        category: 'Sales',
        filters: ['dateRange', 'item', 'category']
      },
      {
        id: 'sales-by-salesman',
        name: 'Sales by Salesman',
        category: 'Sales',
        filters: ['dateRange', 'salesman']
      },
      {
        id: 'sales-summary',
        name: 'Sales Summary',
        category: 'Sales',
        filters: ['dateRange', 'groupBy']
      },
      {
        id: 'purchase-by-supplier',
        name: 'Purchase by Supplier',
        category: 'Purchase',
        filters: ['dateRange', 'supplier', 'paymentStatus']
      },
      {
        id: 'purchase-by-item',
        name: 'Purchase by Item',
        category: 'Purchase',
        filters: ['dateRange', 'item', 'category']
      },
      {
        id: 'stock-summary',
        name: 'Stock Summary',
        category: 'Inventory',
        filters: ['category', 'lowStock']
      },
      {
        id: 'stock-movement',
        name: 'Stock Movement',
        category: 'Inventory',
        filters: ['dateRange', 'item', 'category']
      },
      {
        id: 'customer-ledger',
        name: 'Customer Ledger',
        category: 'Ledger',
        filters: ['dateRange', 'customer']
      },
      {
        id: 'supplier-ledger',
        name: 'Supplier Ledger',
        category: 'Ledger',
        filters: ['dateRange', 'supplier']
      },
      {
        id: 'gst-report',
        name: 'GST Report',
        category: 'Tax',
        filters: ['dateRange', 'gstRate', 'transactionType']
      },
      {
        id: 'payment-collection',
        name: 'Payment Collection Report',
        category: 'Financial',
        filters: ['dateRange', 'paymentMethod']
      },
      {
        id: 'credit-debit-notes',
        name: 'Credit/Debit Notes Report',
        category: 'Financial',
        filters: ['dateRange', 'noteType', 'party']
      },
      {
        id: 'category-wise-sales',
        name: 'Category-wise Sales',
        category: 'Sales',
        filters: ['dateRange', 'category']
      },
      {
        id: 'outstanding-by-customer',
        name: 'Outstanding by Customer',
        category: 'Ledger',
        filters: ['customer', 'ageingDays']
      },
      {
        id: 'outstanding-by-supplier',
        name: 'Outstanding by Supplier',
        category: 'Ledger',
        filters: ['supplier', 'ageingDays']
      },
      {
        id: 'item-wise-batch',
        name: 'Item wise Batch wise Report',
        category: 'Inventory',
        filters: ['item', 'category', 'dateRange']
      }
    ];
  });

  /**
   * Generate report data based on report type and filters
   */
  ipcMain.handle('generate-dynamic-report', async (event, { reportType, filters }) => {
    const db = getDb();

    try {
      switch (reportType) {
        case 'sales-by-customer':
          return generateSalesByCustomer(db, filters);
        case 'sales-by-item':
          return generateSalesByItem(db, filters);
        case 'sales-by-salesman':
          return generateSalesBySalesman(db, filters);
        case 'sales-summary':
          return generateSalesSummary(db, filters);
        case 'purchase-by-supplier':
          return generatePurchaseBySupplier(db, filters);
        case 'purchase-by-item':
          return generatePurchaseByItem(db, filters);
        case 'stock-summary':
          return generateStockSummary(db, filters);
        case 'stock-movement':
          return generateStockMovement(db, filters);
        case 'customer-ledger':
          return generateCustomerLedger(db, filters);
        case 'supplier-ledger':
          return generateSupplierLedger(db, filters);
        case 'gst-report':
          return generateGSTReport(db, filters);
        case 'payment-collection':
          return generatePaymentCollection(db, filters);
        case 'credit-debit-notes':
          return generateCreditDebitNotesReport(db, filters);
        case 'category-wise-sales':
          return generateCategoryWiseSales(db, filters);
        case 'outstanding-by-customer':
          return generateOutstandingByCustomer(db, filters);
        case 'outstanding-by-supplier':
          return generateOutstandingBySupplier(db, filters);
        case 'item-wise-batch':
          return generateItemWiseBatchReport(db, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  });

  /**
   * Get filter options (customers, items, categories, etc.)
   */
  ipcMain.handle('get-report-filter-options', async () => {
    const db = getDb();

    try {
      const customers = db.prepare(`
        SELECT DISTINCT customer_name as name
        FROM sales
        WHERE status_code = 0 AND customer_name IS NOT NULL AND customer_name != ''
        ORDER BY customer_name
      `).all();

      const suppliers = db.prepare(`
        SELECT id, name
        FROM suppliers
        WHERE status_code = 0
        ORDER BY name
      `).all();

      const categories = db.prepare(`
        SELECT id, name
        FROM categories
        WHERE status_code = 0
        ORDER BY name
      `).all();

      const salesmen = db.prepare(`
        SELECT id, name
        FROM salesman
        WHERE status_code = 0
        ORDER BY name
      `).all();

      const items = db.prepare(`
        SELECT id, name, sku
        FROM items
        WHERE status_code = 0
        ORDER BY name
      `).all();

      return {
        customers,
        suppliers,
        categories,
        salesmen,
        items
      };
    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw error;
    }
  });

  /**
   * Generate complex multi-dimensional reports
   */
  ipcMain.handle('generate-complex-report', async (event, { reportType, filters }) => {
    const db = getDb();

    try {
      switch (reportType) {
        case 'salesman-area-item':
          return generateSalesmanAreaItemReport(db, filters);
        case 'customer-category-time':
          return generateCustomerCategoryTimeReport(db, filters);
        case 'supplier-item-payment':
          return generateSupplierItemPaymentReport(db, filters);
        case 'salesman-customer-category':
          return generateSalesmanCustomerCategoryReport(db, filters);
        default:
          throw new Error('Invalid complex report type');
      }
    } catch (error) {
      console.error('Error generating complex report:', error);
      throw error;
    }
  });



}

// Report Generation Functions

function generateSalesByCustomer(db, filters) {
  let query = `
    SELECT
      s.customer_name,
      s.customer_contact,
      s.customer_gstin,
      COUNT(s.id) as total_bills,
      SUM(s.total_amount) as total_amount,
      SUM(s.cgst_total + s.sgst_total) as total_gst,
      SUM(CASE WHEN s.is_paid = 1 THEN s.total_amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN s.is_paid = 0 THEN s.total_amount ELSE 0 END) as outstanding_amount,
      MIN(s.sale_date) as first_sale_date,
      MAX(s.sale_date) as last_sale_date
    FROM sales s
    WHERE s.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.customer) {
    query += ` AND s.customer_name = ?`;
    params.push(filters.customer);
  }

  if (filters.salesman) {
    query += ` AND s.salesman_id = ?`;
    params.push(filters.salesman);
  }

  if (filters.paymentStatus === 'paid') {
    query += ` AND s.is_paid = 1`;
  } else if (filters.paymentStatus === 'unpaid') {
    query += ` AND s.is_paid = 0`;
  }

  query += ` GROUP BY s.customer_name, s.customer_contact, s.customer_gstin`;
  query += ` ORDER BY total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Customer Name', key: 'customer_name', width: 30 },
    { header: 'Contact', key: 'customer_contact', width: 15 },
    { header: 'GSTIN', key: 'customer_gstin', width: 18 },
    { header: 'Total Bills', key: 'total_bills', width: 12 },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Total GST', key: 'total_gst', width: 15, format: 'currency' },
    { header: 'Paid Amount', key: 'paid_amount', width: 15, format: 'currency' },
    { header: 'Outstanding', key: 'outstanding_amount', width: 15, format: 'currency' },
    { header: 'First Sale', key: 'first_sale_date', width: 12, format: 'date' },
    { header: 'Last Sale', key: 'last_sale_date', width: 12, format: 'date' }
  ];

  return { data, columns };
}

function generateSalesByItem(db, filters) {
  let query = `
    SELECT
      i.name as item_name,
      i.sku,
      i.hsn_code,
      c.name as category_name,
      SUM(si.quantity) as total_quantity,
      SUM(si.total_price) as total_amount,
      SUM(si.cgst_amount + si.sgst_amount) as total_gst,
      AVG(si.unit_price) as avg_price,
      COUNT(DISTINCT si.sale_id) as total_bills
    FROM sale_items si
    INNER JOIN items i ON si.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE si.status_code = 0 AND s.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.item) {
    query += ` AND si.item_id = ?`;
    params.push(filters.item);
  }

  if (filters.category) {
    query += ` AND i.category_id = ?`;
    params.push(filters.category);
  }

  query += ` GROUP BY i.id, i.name, i.sku, i.hsn_code, c.name`;
  query += ` ORDER BY total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'HSN Code', key: 'hsn_code', width: 12 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Quantity Sold', key: 'total_quantity', width: 15, format: 'number' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Total GST', key: 'total_gst', width: 15, format: 'currency' },
    { header: 'Avg Price', key: 'avg_price', width: 15, format: 'currency' },
    { header: 'Total Bills', key: 'total_bills', width: 12 }
  ];

  return { data, columns };
}

function generateSalesBySalesman(db, filters) {
  let query = `
    SELECT
      sm.name as salesman_name,
      sm.contact_info,
      sm.working_area,
      COUNT(s.id) as total_bills,
      SUM(s.total_amount) as total_amount,
      SUM(s.cgst_total + s.sgst_total) as total_gst,
      AVG(s.total_amount) as avg_bill_amount,
      SUM(CASE WHEN s.is_paid = 1 THEN s.total_amount ELSE 0 END) as collected_amount
    FROM sales s
    INNER JOIN salesman sm ON s.salesman_id = sm.id
    WHERE s.status_code = 0 AND sm.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.salesman) {
    query += ` AND s.salesman_id = ?`;
    params.push(filters.salesman);
  }

  query += ` GROUP BY sm.id, sm.name, sm.contact_info, sm.working_area`;
  query += ` ORDER BY total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Salesman Name', key: 'salesman_name', width: 25 },
    { header: 'Contact', key: 'contact_info', width: 15 },
    { header: 'Working Area', key: 'working_area', width: 20 },
    { header: 'Total Bills', key: 'total_bills', width: 12 },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Total GST', key: 'total_gst', width: 15, format: 'currency' },
    { header: 'Avg Bill Amount', key: 'avg_bill_amount', width: 15, format: 'currency' },
    { header: 'Collected Amount', key: 'collected_amount', width: 15, format: 'currency' }
  ];

  return { data, columns };
}

function generateSalesSummary(db, filters) {
  let query = `
    SELECT
      DATE(s.sale_date) as sale_date,
      COUNT(s.id) as total_bills,
      SUM(s.total_amount) as total_amount,
      SUM(s.cgst_total) as total_cgst,
      SUM(s.sgst_total) as total_sgst,
      SUM(s.discount) as total_discount,
      AVG(s.total_amount) as avg_bill_amount,
      SUM(CASE WHEN s.is_paid = 1 THEN 1 ELSE 0 END) as paid_bills,
      SUM(CASE WHEN s.is_paid = 0 THEN 1 ELSE 0 END) as unpaid_bills
    FROM sales s
    WHERE s.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  query += ` GROUP BY DATE(s.sale_date)`;
  query += ` ORDER BY sale_date DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Date', key: 'sale_date', width: 15, format: 'date' },
    { header: 'Total Bills', key: 'total_bills', width: 12 },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'CGST', key: 'total_cgst', width: 15, format: 'currency' },
    { header: 'SGST', key: 'total_sgst', width: 15, format: 'currency' },
    { header: 'Discount', key: 'total_discount', width: 15, format: 'currency' },
    { header: 'Avg Bill Amount', key: 'avg_bill_amount', width: 15, format: 'currency' },
    { header: 'Paid Bills', key: 'paid_bills', width: 12 },
    { header: 'Unpaid Bills', key: 'unpaid_bills', width: 12 }
  ];

  return { data, columns };
}

function generatePurchaseBySupplier(db, filters) {
  let query = `
    SELECT
      sup.name as supplier_name,
      sup.contact,
      sup.gstin,
      sup.city,
      sup.state,
      COUNT(p.id) as total_purchases,
      SUM(p.total_amount) as total_amount,
      SUM(p.cgst_total + p.sgst_total) as total_gst,
      SUM(CASE WHEN p.is_paid = 1 THEN p.total_amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN p.is_paid = 0 THEN p.total_amount ELSE 0 END) as outstanding_amount,
      MIN(p.purchase_date) as first_purchase_date,
      MAX(p.purchase_date) as last_purchase_date
    FROM purchases p
    INNER JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE p.status_code = 0 AND sup.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND p.purchase_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.supplier) {
    query += ` AND p.supplier_id = ?`;
    params.push(filters.supplier);
  }

  if (filters.paymentStatus === 'paid') {
    query += ` AND p.is_paid = 1`;
  } else if (filters.paymentStatus === 'unpaid') {
    query += ` AND p.is_paid = 0`;
  }

  query += ` GROUP BY sup.id, sup.name, sup.contact, sup.gstin, sup.city, sup.state`;
  query += ` ORDER BY total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Supplier Name', key: 'supplier_name', width: 30 },
    { header: 'Contact', key: 'contact', width: 15 },
    { header: 'GSTIN', key: 'gstin', width: 18 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'State', key: 'state', width: 15 },
    { header: 'Total Purchases', key: 'total_purchases', width: 15 },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Total GST', key: 'total_gst', width: 15, format: 'currency' },
    { header: 'Paid Amount', key: 'paid_amount', width: 15, format: 'currency' },
    { header: 'Outstanding', key: 'outstanding_amount', width: 15, format: 'currency' },
    { header: 'First Purchase', key: 'first_purchase_date', width: 15, format: 'date' },
    { header: 'Last Purchase', key: 'last_purchase_date', width: 15, format: 'date' }
  ];

  return { data, columns };
}

function generatePurchaseByItem(db, filters) {
  let query = `
    SELECT
      i.name as item_name,
      i.sku,
      i.hsn_code,
      c.name as category_name,
      SUM(pi.quantity) as total_quantity,
      SUM(pi.total_price) as total_amount,
      SUM(pi.cgst_amount + pi.sgst_amount) as total_gst,
      AVG(pi.unit_price) as avg_purchase_price,
      COUNT(DISTINCT pi.purchase_id) as total_purchases
    FROM purchase_items pi
    INNER JOIN items i ON pi.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    INNER JOIN purchases p ON pi.purchase_id = p.id
    WHERE pi.status_code = 0 AND p.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND p.purchase_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.item) {
    query += ` AND pi.item_id = ?`;
    params.push(filters.item);
  }

  if (filters.category) {
    query += ` AND i.category_id = ?`;
    params.push(filters.category);
  }

  query += ` GROUP BY i.id, i.name, i.sku, i.hsn_code, c.name`;
  query += ` ORDER BY total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'HSN Code', key: 'hsn_code', width: 12 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Quantity Purchased', key: 'total_quantity', width: 18, format: 'number' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Total GST', key: 'total_gst', width: 15, format: 'currency' },
    { header: 'Avg Purchase Price', key: 'avg_purchase_price', width: 18, format: 'currency' },
    { header: 'Total Purchases', key: 'total_purchases', width: 15 }
  ];

  return { data, columns };
}

function generateStockSummary(db, filters) {
  let query = `
    SELECT
      i.name as item_name,
      i.sku,
      i.hsn_code,
      c.name as category_name,
      i.unit,
      i.current_stock,
      i.minimum_stock,
      i.mrp,
      i.purchase_rate,
      i.sale_rate,
      (i.current_stock * i.purchase_rate) as stock_value,
      CASE
        WHEN i.current_stock <= i.minimum_stock THEN 'Low Stock'
        ELSE 'In Stock'
      END as stock_status
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.status_code = 0
  `;

  const params = [];

  if (filters.category) {
    query += ` AND i.category_id = ?`;
    params.push(filters.category);
  }

  if (filters.lowStock === true) {
    query += ` AND i.current_stock <= i.minimum_stock`;
  }

  query += ` ORDER BY stock_value DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'HSN Code', key: 'hsn_code', width: 12 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Current Stock', key: 'current_stock', width: 15, format: 'number' },
    { header: 'Minimum Stock', key: 'minimum_stock', width: 15, format: 'number' },
    { header: 'MRP', key: 'mrp', width: 12, format: 'currency' },
    { header: 'Purchase Rate', key: 'purchase_rate', width: 15, format: 'currency' },
    { header: 'Sale Rate', key: 'sale_rate', width: 15, format: 'currency' },
    { header: 'Stock Value', key: 'stock_value', width: 15, format: 'currency' },
    { header: 'Status', key: 'stock_status', width: 12 }
  ];

  return { data, columns };
}

function generateStockMovement(db, filters) {
  let query = `
    SELECT
      i.name as item_name,
      'Sale' as transaction_type,
      s.bill_number as reference_number,
      s.sale_date as transaction_date,
      si.quantity * -1 as quantity,
      si.unit_price as rate,
      s.customer_name as party_name
    FROM sale_items si
    INNER JOIN items i ON si.item_id = i.id
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE si.status_code = 0 AND s.status_code = 0
  `;

  const params = [];
  const params2 = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
    params2.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.item) {
    query += ` AND si.item_id = ?`;
    params.push(filters.item);
  }

  let query2 = `
    SELECT
      i.name as item_name,
      'Purchase' as transaction_type,
      p.invoice_number as reference_number,
      p.purchase_date as transaction_date,
      pi.quantity as quantity,
      pi.unit_price as rate,
      sup.name as party_name
    FROM purchase_items pi
    INNER JOIN items i ON pi.item_id = i.id
    INNER JOIN purchases p ON pi.purchase_id = p.id
    INNER JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE pi.status_code = 0 AND p.status_code = 0
  `;

  if (filters.dateFrom && filters.dateTo) {
    query2 += ` AND p.purchase_date BETWEEN ? AND ?`;
  }

  if (filters.item) {
    query2 += ` AND pi.item_id = ?`;
    params2.push(filters.item);
  }

  const fullQuery = `${query} UNION ALL ${query2} ORDER BY transaction_date DESC`;

  const data = db.prepare(fullQuery).all(...params, ...params2);

  const columns = [
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'Type', key: 'transaction_type', width: 12 },
    { header: 'Reference No', key: 'reference_number', width: 18 },
    { header: 'Date', key: 'transaction_date', width: 15, format: 'date' },
    { header: 'Quantity', key: 'quantity', width: 12, format: 'number' },
    { header: 'Rate', key: 'rate', width: 15, format: 'currency' },
    { header: 'Party Name', key: 'party_name', width: 30 }
  ];

  return { data, columns };
}

function generateCustomerLedger(db, filters) {
  let query = `
    SELECT
      s.sale_date as transaction_date,
      s.bill_number as reference_number,
      'Sale' as transaction_type,
      s.customer_name,
      s.total_amount as debit,
      0 as credit,
      s.is_paid as is_paid
    FROM sales s
    WHERE s.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.customer) {
    query += ` AND s.customer_name = ?`;
    params.push(filters.customer);
  }

  query += ` ORDER BY s.sale_date DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Date', key: 'transaction_date', width: 15, format: 'date' },
    { header: 'Reference No', key: 'reference_number', width: 18 },
    { header: 'Type', key: 'transaction_type', width: 12 },
    { header: 'Customer Name', key: 'customer_name', width: 30 },
    { header: 'Debit', key: 'debit', width: 15, format: 'currency' },
    { header: 'Credit', key: 'credit', width: 15, format: 'currency' },
    { header: 'Status', key: 'is_paid', width: 12, format: 'paymentStatus' }
  ];

  return { data, columns };
}

function generateSupplierLedger(db, filters) {
  let query = `
    SELECT
      p.purchase_date as transaction_date,
      p.invoice_number as reference_number,
      'Purchase' as transaction_type,
      sup.name as supplier_name,
      0 as debit,
      p.total_amount as credit,
      p.is_paid as is_paid
    FROM purchases p
    INNER JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE p.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND p.purchase_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.supplier) {
    query += ` AND p.supplier_id = ?`;
    params.push(filters.supplier);
  }

  query += ` ORDER BY p.purchase_date DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Date', key: 'transaction_date', width: 15, format: 'date' },
    { header: 'Reference No', key: 'reference_number', width: 18 },
    { header: 'Type', key: 'transaction_type', width: 12 },
    { header: 'Supplier Name', key: 'supplier_name', width: 30 },
    { header: 'Debit', key: 'debit', width: 15, format: 'currency' },
    { header: 'Credit', key: 'credit', width: 15, format: 'currency' },
    { header: 'Status', key: 'is_paid', width: 12, format: 'paymentStatus' }
  ];

  return { data, columns };
}

function generateGSTReport(db, filters) {
  let query = `
    SELECT
      s.sale_date as invoice_date,
      s.bill_number as invoice_number,
      s.customer_name as party_name,
      s.customer_gstin as party_gstin,
      'Sale' as transaction_type,
      SUM(si.total_price - si.cgst_amount - si.sgst_amount) as taxable_value,
      si.gst_percentage,
      SUM(si.cgst_amount) as cgst_amount,
      SUM(si.sgst_amount) as sgst_amount,
      SUM(si.total_price) as total_amount
    FROM sales s
    INNER JOIN sale_items si ON s.id = si.sale_id
    WHERE s.status_code = 0 AND si.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.gstRate) {
    query += ` AND si.gst_percentage = ?`;
    params.push(filters.gstRate);
  }

  query += ` GROUP BY s.id, s.sale_date, s.bill_number, s.customer_name, s.customer_gstin, si.gst_percentage`;
  query += ` ORDER BY s.sale_date DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Date', key: 'invoice_date', width: 15, format: 'date' },
    { header: 'Invoice No', key: 'invoice_number', width: 18 },
    { header: 'Party Name', key: 'party_name', width: 30 },
    { header: 'GSTIN', key: 'party_gstin', width: 18 },
    { header: 'Type', key: 'transaction_type', width: 12 },
    { header: 'Taxable Value', key: 'taxable_value', width: 15, format: 'currency' },
    { header: 'GST %', key: 'gst_percentage', width: 10, format: 'percentage' },
    { header: 'CGST', key: 'cgst_amount', width: 15, format: 'currency' },
    { header: 'SGST', key: 'sgst_amount', width: 15, format: 'currency' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' }
  ];

  return { data, columns };
}

function generatePaymentCollection(db, filters) {
  let query = `
    SELECT
      pv.payment_date,
      pv.payment_method,
      COALESCE(s.bill_number, p.invoice_number) as reference_number,
      CASE
        WHEN pv.sale_id IS NOT NULL THEN 'Sale'
        WHEN pv.purchase_id IS NOT NULL THEN 'Purchase'
      END as transaction_type,
      COALESCE(s.customer_name, sup.name) as party_name,
      pv.amount,
      pv.status
    FROM payment_verification pv
    LEFT JOIN sales s ON pv.sale_id = s.id
    LEFT JOIN purchases p ON pv.purchase_id = p.id
    LEFT JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE 1=1
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND pv.payment_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.paymentMethod) {
    query += ` AND pv.payment_method = ?`;
    params.push(filters.paymentMethod);
  }

  query += ` ORDER BY pv.payment_date DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Payment Date', key: 'payment_date', width: 15, format: 'date' },
    { header: 'Payment Method', key: 'payment_method', width: 15 },
    { header: 'Reference No', key: 'reference_number', width: 18 },
    { header: 'Type', key: 'transaction_type', width: 12 },
    { header: 'Party Name', key: 'party_name', width: 30 },
    { header: 'Amount', key: 'amount', width: 15, format: 'currency' },
    { header: 'Status', key: 'status', width: 12 }
  ];

  return { data, columns };
}

function generateCreditDebitNotesReport(db, filters) {
  let query = `
    SELECT
      cdn.note_number,
      cdn.note_type,
      cdn.note_date,
      cdn.reference_type,
      cdn.original_invoice_number,
      cdn.party_name,
      cdn.reason,
      cdn.total_amount,
      cdn.is_settled,
      cdn.settlement_method
    FROM credit_debit_notes cdn
    WHERE cdn.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND cdn.note_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.noteType) {
    query += ` AND cdn.note_type = ?`;
    params.push(filters.noteType);
  }

  if (filters.party) {
    query += ` AND cdn.party_name LIKE ?`;
    params.push(`%${filters.party}%`);
  }

  query += ` ORDER BY cdn.note_date DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Note Number', key: 'note_number', width: 18 },
    { header: 'Note Type', key: 'note_type', width: 12 },
    { header: 'Date', key: 'note_date', width: 15, format: 'date' },
    { header: 'Reference Type', key: 'reference_type', width: 15 },
    { header: 'Original Invoice', key: 'original_invoice_number', width: 18 },
    { header: 'Party Name', key: 'party_name', width: 30 },
    { header: 'Reason', key: 'reason', width: 30 },
    { header: 'Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Settled', key: 'is_settled', width: 10, format: 'boolean' },
    { header: 'Settlement Method', key: 'settlement_method', width: 18 }
  ];

  return { data, columns };
}

function generateCategoryWiseSales(db, filters) {
  let query = `
    SELECT
      c.name as category_name,
      COUNT(DISTINCT si.sale_id) as total_bills,
      SUM(si.quantity) as total_quantity,
      SUM(si.total_price) as total_amount,
      SUM(si.cgst_amount + si.sgst_amount) as total_gst,
      AVG(si.unit_price) as avg_price
    FROM sale_items si
    INNER JOIN items i ON si.item_id = i.id
    INNER JOIN categories c ON i.category_id = c.id
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE si.status_code = 0 AND s.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  if (filters.category) {
    query += ` AND i.category_id = ?`;
    params.push(filters.category);
  }

  query += ` GROUP BY c.id, c.name`;
  query += ` ORDER BY total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Category Name', key: 'category_name', width: 30 },
    { header: 'Total Bills', key: 'total_bills', width: 12 },
    { header: 'Quantity Sold', key: 'total_quantity', width: 15, format: 'number' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Total GST', key: 'total_gst', width: 15, format: 'currency' },
    { header: 'Avg Price', key: 'avg_price', width: 15, format: 'currency' }
  ];

  return { data, columns };
}

function generateOutstandingByCustomer(db, filters) {
  let query = `
    SELECT
      s.customer_name,
      s.customer_contact,
      s.customer_gstin,
      COUNT(s.id) as total_bills,
      SUM(s.total_amount) as total_amount,
      SUM(CASE WHEN s.is_paid = 0 THEN s.total_amount ELSE 0 END) as outstanding_amount,
      MIN(s.sale_date) as oldest_bill_date,
      CAST((julianday('now') - julianday(MIN(s.sale_date))) AS INTEGER) as days_outstanding
    FROM sales s
    WHERE s.status_code = 0 AND s.is_paid = 0
  `;

  const params = [];

  if (filters.customer) {
    query += ` AND s.customer_name = ?`;
    params.push(filters.customer);
  }

  query += ` GROUP BY s.customer_name, s.customer_contact, s.customer_gstin`;

  if (filters.ageingDays) {
    query += ` HAVING days_outstanding >= ?`;
    params.push(filters.ageingDays);
  }

  query += ` ORDER BY outstanding_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Customer Name', key: 'customer_name', width: 30 },
    { header: 'Contact', key: 'customer_contact', width: 15 },
    { header: 'GSTIN', key: 'customer_gstin', width: 18 },
    { header: 'Total Bills', key: 'total_bills', width: 12 },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Outstanding Amount', key: 'outstanding_amount', width: 18, format: 'currency' },
    { header: 'Oldest Bill Date', key: 'oldest_bill_date', width: 15, format: 'date' },
    { header: 'Days Outstanding', key: 'days_outstanding', width: 18 }
  ];

  return { data, columns };
}

function generateOutstandingBySupplier(db, filters) {
  let query = `
    SELECT
      sup.name as supplier_name,
      sup.contact,
      sup.gstin,
      COUNT(p.id) as total_bills,
      SUM(p.total_amount) as total_amount,
      SUM(CASE WHEN p.is_paid = 0 THEN p.total_amount ELSE 0 END) as outstanding_amount,
      MIN(p.purchase_date) as oldest_bill_date,
      CAST((julianday('now') - julianday(MIN(p.purchase_date))) AS INTEGER) as days_outstanding
    FROM purchases p
    INNER JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE p.status_code = 0 AND p.is_paid = 0
  `;

  const params = [];

  if (filters.supplier) {
    query += ` AND p.supplier_id = ?`;
    params.push(filters.supplier);
  }

  query += ` GROUP BY sup.id, sup.name, sup.contact, sup.gstin`;

  if (filters.ageingDays) {
    query += ` HAVING days_outstanding >= ?`;
    params.push(filters.ageingDays);
  }

  query += ` ORDER BY outstanding_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Supplier Name', key: 'supplier_name', width: 30 },
    { header: 'Contact', key: 'contact', width: 15 },
    { header: 'GSTIN', key: 'gstin', width: 18 },
    { header: 'Total Bills', key: 'total_bills', width: 12 },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Outstanding Amount', key: 'outstanding_amount', width: 18, format: 'currency' },
    { header: 'Oldest Bill Date', key: 'oldest_bill_date', width: 15, format: 'date' },
    { header: 'Days Outstanding', key: 'days_outstanding', width: 18 }
  ];

  return { data, columns };
}

function generateItemWiseBatchReport(db, filters) {
  let query = `
    SELECT
      i.name as item_name,
      i.sku,
      i.hsn_code,
      c.name as category_name,
      i.unit,
      ib.batch_number,
      ib.mfg_date,
      ib.exp_date,
      ib.qty_received,
      ib.qty_available,
      ib.purchase_rate,
      ib.mrp,
      p.invoice_number,
      p.purchase_date,
      sup.name as supplier_name,
      CASE
        WHEN ib.exp_date IS NOT NULL AND DATE(ib.exp_date) < DATE('now') THEN 'Expired'
        WHEN ib.exp_date IS NOT NULL AND DATE(ib.exp_date) <= DATE('now', '+30 days') THEN 'Expiring Soon'
        WHEN ib.qty_available <= 0 THEN 'Out of Stock'
        WHEN ib.qty_available < (ib.qty_received * 0.2) THEN 'Low Stock'
        ELSE 'Available'
      END as batch_status,
      (ib.qty_available * ib.purchase_rate) as batch_value
    FROM item_batches ib
    INNER JOIN items i ON ib.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    INNER JOIN purchase_items pi ON ib.purchase_item_id = pi.id
    INNER JOIN purchases p ON pi.purchase_id = p.id
    LEFT JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE i.status_code = 0
  `;

  const params = [];

  if (filters.item) {
    query += ` AND i.id = ?`;
    params.push(filters.item);
  }

  if (filters.category) {
    query += ` AND i.category_id = ?`;
    params.push(filters.category);
  }

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND p.purchase_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  query += ` ORDER BY i.name, p.purchase_date DESC, ib.batch_number`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'HSN Code', key: 'hsn_code', width: 12 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Batch Number', key: 'batch_number', width: 18 },
    { header: 'Mfg Date', key: 'mfg_date', width: 12, format: 'date' },
    { header: 'Exp Date', key: 'exp_date', width: 12, format: 'date' },
    { header: 'Qty Received', key: 'qty_received', width: 15, format: 'number' },
    { header: 'Qty Available', key: 'qty_available', width: 15, format: 'number' },
    { header: 'Purchase Rate', key: 'purchase_rate', width: 15, format: 'currency' },
    { header: 'MRP', key: 'mrp', width: 12, format: 'currency' },
    { header: 'Invoice Number', key: 'invoice_number', width: 18 },
    { header: 'Purchase Date', key: 'purchase_date', width: 15, format: 'date' },
    { header: 'Supplier', key: 'supplier_name', width: 25 },
    { header: 'Status', key: 'batch_status', width: 15 },
    { header: 'Batch Value', key: 'batch_value', width: 15, format: 'currency' }
  ];

  return { data, columns };
}



// Complex Report Functions

function generateSalesmanAreaItemReport(db, filters) {
  let query = `
    SELECT
      sm.name as salesman_name,
      sm.working_area,
      i.name as item_name,
      c.name as category_name,
      COUNT(DISTINCT s.id) as total_bills,
      SUM(si.quantity) as total_quantity,
      SUM(si.total_price) as total_amount,
      AVG(si.unit_price) as avg_price
    FROM sales s
    INNER JOIN salesman sm ON s.salesman_id = sm.id
    INNER JOIN sale_items si ON s.id = si.sale_id
    INNER JOIN items i ON si.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE s.status_code = 0 AND si.status_code = 0 AND sm.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  query += ` GROUP BY sm.id, sm.name, sm.working_area, i.id, i.name, c.name`;
  query += ` ORDER BY sm.name, sm.working_area, total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Salesman', key: 'salesman_name', width: 25 },
    { header: 'Working Area', key: 'working_area', width: 20 },
    { header: 'Item', key: 'item_name', width: 30 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Bills', key: 'total_bills', width: 10 },
    { header: 'Quantity', key: 'total_quantity', width: 12, format: 'number' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Avg Price', key: 'avg_price', width: 15, format: 'currency' }
  ];

  return { data, columns };
}

function generateCustomerCategoryTimeReport(db, filters) {
  let query = `
    SELECT
      s.customer_name,
      c.name as category_name,
      DATE(s.sale_date) as sale_date,
      strftime('%Y-%m', s.sale_date) as month,
      strftime('%Y-W%W', s.sale_date) as week,
      COUNT(DISTINCT s.id) as total_bills,
      SUM(si.quantity) as total_quantity,
      SUM(si.total_price) as total_amount
    FROM sales s
    INNER JOIN sale_items si ON s.id = si.sale_id
    INNER JOIN items i ON si.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE s.status_code = 0 AND si.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  query += ` GROUP BY s.customer_name, c.name, DATE(s.sale_date)`;
  query += ` ORDER BY s.customer_name, c.name, sale_date DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Customer', key: 'customer_name', width: 30 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Date', key: 'sale_date', width: 12, format: 'date' },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Week', key: 'week', width: 12 },
    { header: 'Bills', key: 'total_bills', width: 10 },
    { header: 'Quantity', key: 'total_quantity', width: 12, format: 'number' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' }
  ];

  return { data, columns };
}

function generateSupplierItemPaymentReport(db, filters) {
  let query = `
    SELECT
      sup.name as supplier_name,
      i.name as item_name,
      c.name as category_name,
      CASE WHEN p.is_paid = 1 THEN 'Paid' ELSE 'Unpaid' END as payment_status,
      p.payment_method,
      COUNT(DISTINCT p.id) as total_purchases,
      SUM(pi.quantity) as total_quantity,
      SUM(pi.total_price) as total_amount,
      AVG(pi.unit_price) as avg_price
    FROM purchases p
    INNER JOIN suppliers sup ON p.supplier_id = sup.id
    INNER JOIN purchase_items pi ON p.id = pi.purchase_id
    INNER JOIN items i ON pi.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE p.status_code = 0 AND pi.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND p.purchase_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  query += ` GROUP BY sup.id, sup.name, i.id, i.name, c.name, p.is_paid, p.payment_method`;
  query += ` ORDER BY sup.name, i.name, total_amount DESC`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Supplier', key: 'supplier_name', width: 30 },
    { header: 'Item', key: 'item_name', width: 30 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Payment Status', key: 'payment_status', width: 15 },
    { header: 'Payment Method', key: 'payment_method', width: 15 },
    { header: 'Purchases', key: 'total_purchases', width: 12 },
    { header: 'Quantity', key: 'total_quantity', width: 12, format: 'number' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Avg Price', key: 'avg_price', width: 15, format: 'currency' }
  ];

  return { data, columns };
}

function generateSalesmanCustomerCategoryReport(db, filters) {
  let query = `
    SELECT
      sm.name as salesman_name,
      s.customer_name,
      c.name as category_name,
      COUNT(DISTINCT s.id) as total_bills,
      SUM(si.quantity) as total_quantity,
      SUM(si.total_price) as total_amount,
      AVG(s.total_amount) as avg_bill_amount
    FROM sales s
    INNER JOIN salesman sm ON s.salesman_id = sm.id
    INNER JOIN sale_items si ON s.id = si.sale_id
    INNER JOIN items i ON si.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE s.status_code = 0 AND si.status_code = 0 AND sm.status_code = 0
  `;

  const params = [];

  if (filters.dateFrom && filters.dateTo) {
    query += ` AND s.sale_date BETWEEN ? AND ?`;
    params.push(filters.dateFrom, filters.dateTo);
  }

  query += ` GROUP BY sm.id, sm.name, s.customer_name, c.name`;
  query += ` ORDER BY sm.name, s.customer_name, c.name`;

  const data = db.prepare(query).all(...params);

  const columns = [
    { header: 'Salesman', key: 'salesman_name', width: 25 },
    { header: 'Customer', key: 'customer_name', width: 30 },
    { header: 'Category', key: 'category_name', width: 20 },
    { header: 'Bills', key: 'total_bills', width: 10 },
    { header: 'Quantity', key: 'total_quantity', width: 12, format: 'number' },
    { header: 'Total Amount', key: 'total_amount', width: 15, format: 'currency' },
    { header: 'Avg Bill', key: 'avg_bill_amount', width: 15, format: 'currency' }
  ];

  return { data, columns };
}
