export function registerExportHandlers({ ipcMain, getDb }) {
  ipcMain.handle('get-export-inventory-data', async () => {
    return getDb().prepare(`
      SELECT i.*, c.name as category_name, s.name as supplier_name, s.gstin as supplier_gstin
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN contacts s ON i.last_contact_id = s.id
      WHERE (i.status_code = 0 OR i.status_code IS NULL)
      ORDER BY i.name
    `).all();
  });

  ipcMain.handle('get-export-sales-data', async (event, { startDate, endDate }) => {
    return getDb().prepare(`
      SELECT s.bill_number, s.sale_date, c.name as customer_name, c.address as customer_address, c.gstin as customer_gstin,
             s.total_amount, s.cgst_total, s.sgst_total, s.discount, s.rounding_off,
             GROUP_CONCAT(i.hsn_code) as hsn_code,
             GROUP_CONCAT(si.gst_percentage) as gst_percent
      FROM sales s
      LEFT JOIN contacts c ON s.contact_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN items i ON si.item_id = i.id
      WHERE s.sale_date BETWEEN ? AND ?
      AND (s.status_code = 0 OR s.status_code IS NULL)
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `).all(startDate, endDate);
  });

  ipcMain.handle('get-export-purchase-data', async (event, { startDate, endDate }) => {
    return getDb().prepare(`
      SELECT p.invoice_number, p.purchase_date, s.name as supplier_name, s.address as supplier_address, s.gstin as supplier_gstin,
             p.total_amount, p.cgst_total, p.sgst_total, p.discount, p.rounding_off,
             GROUP_CONCAT(i.hsn_code) as hsn_code,
             GROUP_CONCAT(pi.gst_percentage) as gst_percent
      FROM purchases p
      LEFT JOIN contacts s ON p.contact_id = s.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN items i ON pi.item_id = i.id
      WHERE p.purchase_date BETWEEN ? AND ?
      AND (p.status_code = 0 OR p.status_code IS NULL)
      GROUP BY p.id
      ORDER BY p.purchase_date DESC
    `).all(startDate, endDate);
  });
}


