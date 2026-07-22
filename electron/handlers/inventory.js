function getItemPurchaseHistory(getDb, itemId) {
  return getDb()
    .prepare(`
      SELECT pi.*, p.purchase_date, c_supp.name as supplier_name, c_supp.gstin as supplier_gstin
      FROM purchase_items pi
      LEFT JOIN purchases p ON pi.purchase_id = p.id
      LEFT JOIN contacts c_supp ON p.contact_id = c_supp.id
      WHERE pi.item_id = ?
      ORDER BY p.purchase_date DESC
    `)
    .all(itemId);
}

function getNextSku(getDb) {
  try {
    const numericSkus = getDb().prepare(`
      SELECT sku FROM items
      WHERE (status_code = 0 OR status_code IS NULL)
      AND sku GLOB '[0-9]*'
      AND sku = CAST(sku AS INTEGER)
      ORDER BY CAST(sku AS INTEGER) DESC
    `).all();

    if (numericSkus.length === 0) {
      return '1';
    }

    const highestSku = Math.max(...numericSkus.map((item) => parseInt(item.sku, 10)));

    for (let i = 1; i <= highestSku; i++) {
      const exists = getDb().prepare(`
        SELECT id FROM items
        WHERE sku = ? AND (status_code = 0 OR status_code IS NULL)
      `).get(i.toString());

      if (!exists) {
        return i.toString();
      }
    }

    return (highestSku + 1).toString();
  } catch (error) {
    console.error('Error generating SKU:', error);
    return '1';
  }
}

export function registerInventoryHandlers({ ipcMain, getDb }) {
  ipcMain.handle('get-inventory', async () => {
    try {
      return getDb().prepare(`
        SELECT i.*, c.name as category_name, c_supp.name as supplier_name, c_supp.gstin as supplier_gstin
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN contacts c_supp ON i.last_contact_id = c_supp.id
        WHERE (i.status_code = 0 OR i.status_code IS NULL)
        ORDER BY i.name
      `).all();
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  ipcMain.handle('get-items', async () => {
    return getDb()
      .prepare('SELECT * FROM items WHERE (status_code = 0 OR status_code IS NULL) ORDER BY name')
      .all();
  });

  ipcMain.handle('check-sku-exists', async (event, sku, excludeId = null) => {
    try {
      let query = 'SELECT id FROM items WHERE sku = ? AND (status_code = 0 OR status_code IS NULL)';
      const params = [sku];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const row = getDb().prepare(query).get(...params);
      return !!row;
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
  // electron/handlers/items.js
ipcMain.handle('get-item-batches', async (event, itemId) => {
  return getDb().prepare('SELECT * FROM item_batches WHERE item_id = ? AND qty_available > 0').all(itemId);
});

  ipcMain.handle('add-item', async (event, itemData) => {
    try {
      const exists = getDb()
        .prepare('SELECT id FROM items WHERE sku = ? AND (status_code = 0 OR status_code IS NULL)')
        .get(itemData.sku);
      if (exists) throw new Error('SKU already exists');

      const stmt = getDb().prepare(`
        INSERT INTO items
          (name, sku, hsn_code, description, unit, mrp, purchase_rate, sale_rate, gst_percentage, category_id, current_stock, minimum_stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        itemData.name,
        itemData.sku,
        itemData.hsn_code,
        itemData.description,
        itemData.unit,
        itemData.mrp,
        itemData.purchase_rate,
        itemData.sale_rate,
        itemData.gst_percentage,
        itemData.category_id,
        itemData.current_stock,
        itemData.minimum_stock
      );

      return { id: result.lastInsertRowid, ...itemData };
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  ipcMain.handle('update-item', async (event, { id, sku, ...rest }) => {
    try {
      const exists = getDb()
        .prepare(
          'SELECT id FROM items WHERE sku = ? AND id != ? AND (status_code = 0 OR status_code IS NULL)'
        )
        .get(sku, id);
      if (exists) throw new Error('SKU already exists');

      const stmt = getDb().prepare(`
        UPDATE items SET
          name = ?, sku = ?, hsn_code = ?, description = ?, unit = ?, mrp = ?, purchase_rate = ?, sale_rate = ?, gst_percentage = ?, category_id = ?, current_stock = ?, minimum_stock = ?
        WHERE id = ?
      `);

      const result = stmt.run(
        rest.name,
        sku,
        rest.hsn_code,
        rest.description,
        rest.unit,
        rest.mrp,
        rest.purchase_rate,
        rest.sale_rate,
        rest.gst_percentage,
        rest.category_id,
        rest.current_stock,
        rest.minimum_stock,
        id
      );

      return result.changes > 0;
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  ipcMain.handle('delete-item', async (event, id) => {
    try {
      const stmt = getDb().prepare('UPDATE items SET status_code = 1 WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  ipcMain.handle('get-item-purchase-history', async (event, itemId) => {
    return getItemPurchaseHistory(getDb, itemId);
  });

  ipcMain.handle('get-item-details', async (event, itemId) => {
    const item = getDb()
      .prepare(`
        SELECT i.*, c.name as category_name, c_supp.name as supplier_name, c_supp.gstin as supplier_gstin
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN contacts c_supp ON i.last_contact_id = c_supp.id
        WHERE i.id = ? and (i.status_code = 0 OR i.status_code IS NULL)
      `)
      .get(itemId);

    const purchaseHistory = getItemPurchaseHistory(getDb, itemId);
    return { ...item, purchaseHistory };
  });

  ipcMain.handle('get-next-sku', async () => getNextSku(getDb));
}

export const inventoryHelpers = {
  getItemPurchaseHistory,
  getNextSku
};


